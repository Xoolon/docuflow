"""
File Conversion API v2
- Doc conversion:   500 tokens flat
- Image conversion: 200 tokens flat
- Free users (never purchased): output watermarked
"""
import os
import tempfile
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import Job, JobStatus, JobType, User
from app.services.conversion import CONTENT_TYPES, convert_file, is_supported
from app.services.storage import get_presigned_url, upload_bytes
from app.services.watermark import apply_watermark
from app.utils.auth import get_current_user
from app.utils.tokens import (
    deduct_doc_conversion,
    deduct_img_conversion,
    require_tokens,
)

router = APIRouter(prefix="/convert", tags=["conversion"])

MAX_BYTES  = settings.file_max_size_mb * 1024 * 1024
IMAGE_FMTS = {"jpg", "jpeg", "png", "webp", "heic", "svg", "gif"}
DOC_COST   = 500
IMG_COST   = 200


@router.get("/formats")
async def get_formats():
    from app.services.conversion import CONVERSION_MAP
    return {
        "conversions": [{"from": a, "to": b} for a, b in sorted(CONVERSION_MAP)],
        "documents":   ["pdf", "docx", "txt", "md", "html", "rtf", "csv", "xlsx"],
        "images":      ["jpg", "jpeg", "png", "webp", "heic", "svg", "gif"],
        "token_costs": {
            "document_conversion": DOC_COST,
            "image_conversion":    IMG_COST,
        },
    }


@router.post("/")
async def convert(
    file:          UploadFile = File(...),
    output_format: str        = Form(...),
    db:            Session    = Depends(get_db),
    current_user:  User       = Depends(get_current_user),
):
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max {settings.file_max_size_mb} MB.",
        )

    filename = file.filename or "upload.bin"
    in_ext   = Path(filename).suffix.lower().lstrip(".")
    out_ext  = output_format.lower().lstrip(".")

    if not in_ext:
        raise HTTPException(
            status_code=400,
            detail="Cannot determine file type. Make sure your file has an extension.",
        )
    if not is_supported(in_ext, out_ext):
        raise HTTPException(
            status_code=400,
            detail=f"Conversion .{in_ext} → .{out_ext} is not supported.",
        )

    # Check token balance BEFORE doing any work
    is_image      = in_ext in IMAGE_FMTS or out_ext in IMAGE_FMTS
    tokens_needed = IMG_COST if is_image else DOC_COST
    require_tokens(current_user, tokens_needed)

    job = Job(
        user_id           = current_user.id,
        job_type          = JobType.conversion,
        status            = JobStatus.processing,
        original_filename = filename,
        input_format      = in_ext,
        output_format     = out_ext,
        file_size_bytes   = len(content),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path  = os.path.join(tmpdir, f"input.{in_ext}")
            out_path = os.path.join(tmpdir, f"output.{out_ext}")
            with open(in_path, "wb") as f:
                f.write(content)

            convert_file(in_path, in_ext, out_ext, out_path)

            # Free users = never purchased any tokens → watermark output
            is_free = (current_user.tokens_purchased == 0)
            if is_free:
                wm_path = os.path.join(tmpdir, f"watermarked.{out_ext}")
                apply_watermark(out_path, wm_path, out_ext)
                final_path = wm_path
            else:
                final_path = out_path

            result_bytes = Path(final_path).read_bytes()

        # Upload to storage (non-fatal if unavailable in dev)
        output_key   = f"outputs/{current_user.id}/{uuid.uuid4()}.{out_ext}"
        content_type = CONTENT_TYPES.get(out_ext, "application/octet-stream")
        try:
            upload_bytes(result_bytes, output_key, content_type)
        except Exception as e:
            logger.warning(f"Storage upload skipped (non-fatal): {e}")

        # Deduct tokens AFTER successful conversion
        if is_image:
            deduct_img_conversion(db, current_user, job_id=job.id)
            tokens_charged = IMG_COST
        else:
            deduct_doc_conversion(db, current_user, job_id=job.id)
            tokens_charged = DOC_COST

        job.status          = JobStatus.completed
        job.output_file_key = output_key
        job.watermarked     = is_free
        job.tokens_charged  = tokens_charged
        job.completed_at    = datetime.utcnow()
        db.commit()

        out_filename = f"{Path(filename).stem}.{out_ext}"
        return StreamingResponse(
            iter([result_bytes]),
            media_type = content_type,
            headers    = {
                "Content-Disposition":          f'attachment; filename="{out_filename}"',
                "X-Job-Id":                     job.id,
                "X-Watermarked":                str(is_free).lower(),
                "X-Tokens-Charged":             str(tokens_charged),
                "X-Tokens-Remaining":           str(current_user.tokens_balance),
                "Access-Control-Expose-Headers":
                    "X-Job-Id,X-Watermarked,X-Tokens-Charged,X-Tokens-Remaining",
            },
        )

    except HTTPException:
        raise
    except Exception as exc:
        job.status        = JobStatus.failed
        job.error_message = str(exc)
        db.commit()
        logger.error(f"Conversion failed [job={job.id}]: {exc}")
        raise HTTPException(status_code=500, detail=f"Conversion failed: {exc}")


@router.get("/history")
async def get_history(
    limit:        int     = 20,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    jobs = (
        db.query(Job)
        .filter(Job.user_id == current_user.id, Job.job_type == JobType.conversion)
        .order_by(Job.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    return [
        {
            "id":               j.id,
            "status":           j.status,
            "original_filename":j.original_filename,
            "input_format":     j.input_format,
            "output_format":    j.output_format,
            "watermarked":      j.watermarked,
            "tokens_charged":   j.tokens_charged,
            "created_at":       j.created_at.isoformat(),
            "completed_at":     j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


@router.get("/download/{job_id}")
async def get_download_url(
    job_id:       str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    job = db.query(Job).filter(
        Job.id == job_id, Job.user_id == current_user.id
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != JobStatus.completed:
        raise HTTPException(status_code=400, detail="Job not yet complete")
    if not job.output_file_key:
        raise HTTPException(status_code=404, detail="Output file not found")
    url = get_presigned_url(job.output_file_key, expires_in=3600)
    return {"download_url": url, "expires_in": 3600}


@router.get("/balance")
async def get_balance(current_user: User = Depends(get_current_user)):
    """Quick token balance check — call after each conversion to sync UI."""
    return {
        "tokens_balance":  current_user.tokens_balance,
        "tokens_consumed": current_user.tokens_consumed,
        "doc_cost":        DOC_COST,
        "img_cost":        IMG_COST,
    }