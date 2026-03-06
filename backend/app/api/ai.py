"""
AI API v2 — deducts exact Anthropic tokens from wallet after each generation
"""
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from loguru import logger

from app.config import settings
from app.database import get_db
from app.models.models import (
    Job, JobStatus, JobType, User,
    ANTHROPIC_INPUT_PER_TOKEN, ANTHROPIC_OUTPUT_PER_TOKEN,
)
from app.services.ai_service import process_document, InsufficientCreditsError
from app.services.conversion import CONTENT_TYPES, convert_file
from app.utils.auth import get_current_user
from app.utils.tokens import deduct_ai_usage, require_tokens

router = APIRouter(prefix="/ai", tags=["ai"])
VALID_TASKS = {"generate", "improve", "professional", "ats", "summarize", "reformat"}


class AIRequest(BaseModel):
    task: str
    text_input: Optional[str] = None
    document_type: Optional[str] = None
    format_spec: Optional[str] = None
    export_format: Optional[str] = "txt"

    @field_validator("task")
    @classmethod
    def validate_task(cls, v):
        if v not in VALID_TASKS:
            raise ValueError(f"task must be one of: {sorted(VALID_TASKS)}")
        return v


@router.get("/tasks")
async def list_tasks():
    return {
        "tasks": [
            {"id": "generate",     "label": "✨ Generate Document",  "cost": "exact tokens used"},
            {"id": "improve",      "label": "🔧 Improve Writing",     "cost": "exact tokens used"},
            {"id": "professional", "label": "💼 Make Professional",   "cost": "exact tokens used"},
            {"id": "ats",          "label": "🎯 Optimize for ATS",    "cost": "exact tokens used"},
            {"id": "summarize",    "label": "📋 Summarize",           "cost": "exact tokens used"},
            {"id": "reformat",     "label": "✂️ Reformat Cleanly",    "cost": "exact tokens used"},
        ]
    }


@router.get("/balance")
async def get_balance(current_user: User = Depends(get_current_user)):
    return {
        "tokens_balance":    current_user.tokens_balance,
        "tokens_consumed":   current_user.tokens_consumed,
        "tokens_purchased":  current_user.tokens_purchased,
        "doc_conversion_cost": 500,
        "img_conversion_cost": 200,
    }


@router.post("/estimate")
async def estimate_cost(text: str):
    """Rough token estimate before submitting (4 chars ≈ 1 token)."""
    input_est  = max(1, len(text) // 4)
    output_est = input_est * 2
    total_est  = input_est + output_est
    cost_usd   = (
        input_est  * ANTHROPIC_INPUT_PER_TOKEN +
        output_est * ANTHROPIC_OUTPUT_PER_TOKEN
    )
    return {
        "estimated_tokens":  total_est,
        "estimated_cost_usd": round(cost_usd, 6),
        "input_estimate":    input_est,
        "output_estimate":   output_est,
    }


@router.post("/process")
async def process(
    request:      AIRequest,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    text = (request.text_input or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text_input must not be empty.")

    # Soft pre-flight: rough estimate so we fail fast before the API call
    estimated = max(1, len(text) // 4) * 3
    require_tokens(current_user, min(estimated // 2, 100))

    job = Job(
        user_id   = current_user.id,
        job_type  = JobType.ai_generation,
        status    = JobStatus.processing,
        ai_task   = request.task,
        ai_prompt = f"{request.task}: {text[:200]}",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        result = await process_document(
            task             = request.task,
            user_input       = text,
            max_input_tokens = current_user.tokens_balance,
            format_spec      = request.format_spec,
            document_type    = request.document_type,
        )

        # Deduct EXACT tokens reported by Anthropic API
        usage = deduct_ai_usage(
            db,
            current_user,
            input_tokens  = result["input_tokens"],
            output_tokens = result["output_tokens"],
            job_id        = job.id,
            task          = request.task,
        )

        job.status         = JobStatus.completed
        job.ai_result      = result["result"]
        job.input_tokens   = result["input_tokens"]
        job.output_tokens  = result["output_tokens"]
        job.total_tokens   = result["input_tokens"] + result["output_tokens"]
        job.tokens_charged = usage["tokens_charged"]
        job.api_cost_usd   = usage["api_cost_usd"]
        job.completed_at   = datetime.utcnow()
        db.commit()

        export_fmt = (request.export_format or "txt").lower().lstrip(".")

        if export_fmt == "txt":
            return {
                "job_id":           job.id,
                "task":             result["task"],
                "task_display":     result["task_display"],
                "result":           result["result"],
                "tokens_used":      job.total_tokens,
                "tokens_remaining": current_user.tokens_balance,
                "api_cost_usd":     job.api_cost_usd,
                "model":            result["model"],
            }

        # Export to another format (docx, pdf, etc.)
        with tempfile.TemporaryDirectory() as tmpdir:
            txt_path = os.path.join(tmpdir, "result.txt")
            Path(txt_path).write_text(result["result"], encoding="utf-8")
            out_path = os.path.join(tmpdir, f"result.{export_fmt}")
            convert_file(txt_path, "txt", export_fmt, out_path)
            file_bytes = Path(out_path).read_bytes()

        return StreamingResponse(
            iter([file_bytes]),
            media_type = CONTENT_TYPES.get(export_fmt, "application/octet-stream"),
            headers    = {
                "Content-Disposition":
                    f'attachment; filename="docuflow_{request.task}.{export_fmt}"',
                "X-Job-Id":           job.id,
                "X-Tokens-Used":      str(job.total_tokens),
                "X-Tokens-Remaining": str(current_user.tokens_balance),
                "Access-Control-Expose-Headers":
                    "X-Job-Id,X-Tokens-Used,X-Tokens-Remaining",
            },
        )

    except HTTPException:
        raise
    except ValueError as e:
        job.status        = JobStatus.failed
        job.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=400, detail=str(e))
    except InsufficientCreditsError as e:  # ← new block
        job.status = JobStatus.failed
        job.error_message = str(e)
        db.commit()
        raise HTTPException(status_code=402, detail=str(e))
    except Exception as e:
        job.status        = JobStatus.failed
        job.error_message = str(e)
        db.commit()
        logger.error(f"AI job {job.id} failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_history(
    limit:        int     = 20,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    jobs = (
        db.query(Job)
        .filter(Job.user_id == current_user.id, Job.job_type == JobType.ai_generation)
        .order_by(Job.created_at.desc())
        .limit(min(limit, 100))
        .all()
    )
    return [
        {
            "id":          j.id,
            "status":      j.status,
            "task":        j.ai_task,
            "tokens_used": j.total_tokens,
            "api_cost_usd":j.api_cost_usd,
            "created_at":  j.created_at.isoformat(),
        }
        for j in jobs
    ]


@router.post("/extract-text")
async def extract_text(
    file:         UploadFile = File(...),
    current_user: User       = Depends(get_current_user),
):
    """Extract raw text from an uploaded file before AI processing."""
    content  = await file.read()
    filename = file.filename or "upload.bin"
    ext      = Path(filename).suffix.lower().lstrip(".")

    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Max 5 MB for text extraction.")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            in_path = os.path.join(tmpdir, f"input.{ext}")
            Path(in_path).write_bytes(content)

            if ext == "pdf":
                import pdfplumber
                with pdfplumber.open(in_path) as pdf:
                    text = "\n\n".join(p.extract_text() or "" for p in pdf.pages)
            elif ext in ("docx", "doc"):
                from docx import Document
                doc  = Document(in_path)
                text = "\n".join(p.text for p in doc.paragraphs)
            elif ext in ("txt", "md", "html", "rtf"):
                text = Path(in_path).read_text(encoding="utf-8", errors="replace")
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot extract text from .{ext} files.",
                )

        # Truncate to roughly what the user can afford
        max_chars = current_user.tokens_balance * 4
        if len(text) > max_chars:
            text = text[:max_chars] + "\n\n[Truncated to your token balance limit]"

        return {"text": text, "char_count": len(text)}

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Text extraction error: {exc}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")