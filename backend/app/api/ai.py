"""
AI processing endpoint — uses Claude Haiku for cost efficiency.

Error codes returned to frontend:
  402  insufficient_docuflow_tokens   — user's DocuFlow balance too low
  429  daily_limit_reached            — free tier daily job used
  503  ai_service_unavailable         — Anthropic API transient / network error
  503  anthropic_credits_exhausted    — Anthropic account has no billing credits
  500  ai_error                       — unexpected failure
"""
import logging
from datetime import datetime, date
from typing import Optional

import anthropic
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import (
    User, Job, JobStatus, JobType,
    TokenTransaction, TokenTxType,
    ANTHROPIC_INPUT_PER_TOKEN, ANTHROPIC_OUTPUT_PER_TOKEN,
)
from app.utils.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])

# ── Model ──────────────────────────────────────────────────────────────────────
CLAUDE_MODEL = "claude-haiku-4-5-20251001"

# ── Task prompts ───────────────────────────────────────────────────────────────
TASK_PROMPTS = {
    "generate": (
        "You are an expert document writer. Create a complete, well-structured document "
        "based on the description provided. Match the requested document type and any "
        "format specifications. Output only the document content, no meta-commentary."
    ),
    "improve": (
        "You are an expert editor. Improve the writing clarity, flow, and impact of the "
        "provided text. Preserve the author's voice and meaning. Output only the improved text."
    ),
    "professional": (
        "You are a business writing expert. Rewrite the provided text in a polished, "
        "professional tone suitable for formal business communication. "
        "Output only the rewritten text."
    ),
    "ats": (
        "You are an expert resume writer and ATS optimization specialist. Optimize the "
        "provided resume/CV for applicant tracking systems: use strong action verbs, "
        "incorporate relevant keywords, ensure clean formatting. "
        "Output only the optimized document."
    ),
    "summarize": (
        "You are an expert at creating concise, accurate summaries. Summarize the provided "
        "text into clear, well-organized key points. Preserve all critical information. "
        "Output only the summary."
    ),
    "reformat": (
        "You are a document formatting expert. Reformat the provided text with clean "
        "structure, logical headings, and consistent formatting. "
        "Output only the reformatted document."
    ),
}

TASK_DISPLAY = {
    "generate":     "Document generation",
    "improve":      "Writing improvement",
    "professional": "Professional rewrite",
    "ats":          "ATS optimization",
    "summarize":    "Summarization",
    "reformat":     "Reformatting",
}

# ── Schemas ────────────────────────────────────────────────────────────────────
class AIProcessRequest(BaseModel):
    task:          str
    text_input:    str
    document_type: Optional[str] = None
    format_spec:   Optional[str] = None
    export_format: str = "txt"


class AIProcessResponse(BaseModel):
    job_id:       str
    task:         str
    task_display: str
    result:       str
    tokens_used:  int
    model:        str


# ── Helpers ────────────────────────────────────────────────────────────────────
def _get_anthropic_client() -> anthropic.Anthropic:
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail={
                "code":    "ai_service_unavailable",
                "message": "AI service is not configured. Please contact support.",
            },
        )
    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _build_user_prompt(req: AIProcessRequest) -> str:
    parts = []
    if req.document_type:
        parts.append(f"Document type: {req.document_type}")
    if req.format_spec:
        parts.append(f"Format requirements: {req.format_spec}")
    parts.append("")
    parts.append(
        f"Description:\n{req.text_input}"
        if req.task == "generate"
        else f"Text to process:\n{req.text_input}"
    )
    return "\n".join(parts)


def _check_daily_free_limit(user: User, db: Session) -> bool:
    """True if free user has already used their daily AI generation."""
    if (user.tokens_purchased or 0) > 0:
        return False
    today_start = datetime.combine(date.today(), datetime.min.time())
    used_today = (
        db.query(Job)
        .filter(
            Job.user_id   == user.id,
            Job.job_type  == JobType.ai_generation,
            Job.status    == JobStatus.completed,
            Job.created_at >= today_start,
        )
        .count()
    )
    limit = getattr(settings, "free_ai_generations_per_day", 1)
    return used_today >= limit


# ── Routes ─────────────────────────────────────────────────────────────────────
@router.post("/process", response_model=AIProcessResponse)
async def process_ai(
    req:          AIProcessRequest,
    current_user: User    = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    if req.task not in TASK_PROMPTS:
        raise HTTPException(status_code=400, detail="Invalid task type.")

    # Daily free limit
    if _check_daily_free_limit(current_user, db):
        raise HTTPException(
            status_code=429,
            detail={
                "code":    "daily_limit_reached",
                "message": "You've used your free AI generation for today. "
                           "Buy tokens to unlock unlimited AI jobs.",
            },
        )

    # Input length limit
    max_chars = (
        getattr(settings, "paid_ai_max_input_tokens",  2000) * 4
        if (current_user.tokens_purchased or 0) > 0
        else getattr(settings, "free_ai_max_input_tokens", 500) * 4
    )
    if len(req.text_input) > max_chars:
        raise HTTPException(
            status_code=400,
            detail=f"Input too long. Maximum {max_chars // 4} words for your plan.",
        )

    # DocuFlow token balance check
    MIN_BALANCE = 100
    if (current_user.tokens_balance or 0) < MIN_BALANCE:
        raise HTTPException(
            status_code=402,
            detail={
                "code":     "insufficient_docuflow_tokens",
                "balance":  current_user.tokens_balance,
                "required": MIN_BALANCE,
                "message":  "Your DocuFlow token balance is too low. Top up to continue.",
            },
        )

    # Create Job record
    job = Job(
        user_id   = current_user.id,
        job_type  = JobType.ai_generation,
        status    = JobStatus.processing,
        ai_task   = req.task,
        ai_prompt = req.text_input[:500],
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # ── Anthropic call ─────────────────────────────────────────────────────────
    client = _get_anthropic_client()
    try:
        logger.info(f"Calling Anthropic model={CLAUDE_MODEL} user={current_user.id}")
        response = client.messages.create(
            model      = CLAUDE_MODEL,
            max_tokens = 4096,
            system     = TASK_PROMPTS[req.task],
            messages   = [{"role": "user", "content": _build_user_prompt(req)}],
        )

    except anthropic.AuthenticationError:
        logger.error("Anthropic AuthenticationError — API key invalid")
        job.status = JobStatus.failed; db.commit()
        raise HTTPException(status_code=503, detail={"code": "ai_service_unavailable", "message": "AI service configuration error. Please contact support."})

    except anthropic.PermissionDeniedError:
        logger.error("Anthropic PermissionDeniedError — account has no credits")
        job.status = JobStatus.failed; db.commit()
        raise HTTPException(status_code=503, detail={"code": "anthropic_credits_exhausted", "message": "AI service is temporarily unavailable. Please try again later.", "anthropic_issue": True})

    except anthropic.RateLimitError:
        logger.warning("Anthropic rate limit hit")
        job.status = JobStatus.failed; db.commit()
        raise HTTPException(status_code=503, detail={"code": "ai_service_unavailable", "message": "AI service is busy. Please wait a moment and try again."})

    except anthropic.APIStatusError as e:
        logger.error(f"Anthropic APIStatusError {e.status_code}: {e.message}")
        job.status = JobStatus.failed; db.commit()
        code = "anthropic_credits_exhausted" if e.status_code == 402 else "ai_service_unavailable"
        raise HTTPException(status_code=503, detail={"code": code, "message": "AI service is temporarily unavailable. Please try again later."})

    except Exception as e:
        logger.error(f"Unexpected AI error: {e}")
        job.status = JobStatus.failed; db.commit()
        raise HTTPException(status_code=500, detail={"code": "ai_error", "message": "An unexpected error occurred. Please try again."})

    # ── Persist result ─────────────────────────────────────────────────────────
    result_text   = response.content[0].text if response.content else ""
    input_tokens  = response.usage.input_tokens
    output_tokens = response.usage.output_tokens
    total_tokens  = input_tokens + output_tokens
    model_used    = getattr(response, "model", CLAUDE_MODEL)
    api_cost      = (input_tokens * ANTHROPIC_INPUT_PER_TOKEN) + (output_tokens * ANTHROPIC_OUTPUT_PER_TOKEN)

    # Deduct from user wallet
    new_balance = max(0, (current_user.tokens_balance or 0) - total_tokens)
    current_user.tokens_balance  = new_balance
    current_user.tokens_consumed = (current_user.tokens_consumed or 0) + total_tokens

    # Ledger entry — matches TokenTransaction schema exactly
    tx = TokenTransaction(
        user_id       = current_user.id,
        tx_type       = TokenTxType.ai_usage,
        tokens_delta  = -total_tokens,
        tokens_after  = new_balance,
        input_tokens  = input_tokens,
        output_tokens = output_tokens,
        api_cost_usd  = api_cost,
        job_id        = job.id,
        description   = f"AI: {TASK_DISPLAY.get(req.task, req.task)}",
    )
    db.add(tx)

    # Update job
    job.status         = JobStatus.completed
    job.ai_result      = result_text
    job.input_tokens   = input_tokens
    job.output_tokens  = output_tokens
    job.total_tokens   = total_tokens
    job.tokens_charged = total_tokens
    job.api_cost_usd   = api_cost
    job.completed_at   = datetime.utcnow()
    db.commit()

    return AIProcessResponse(
        job_id       = job.id,
        task         = req.task,
        task_display = TASK_DISPLAY.get(req.task, req.task),
        result       = result_text,
        tokens_used  = total_tokens,
        model        = model_used,
    )


@router.get("/history")
async def ai_history(
    limit:        int     = 20,
    current_user: User    = Depends(get_current_user),
    db:           Session = Depends(get_db),
):
    jobs = (
        db.query(Job)
        .filter(
            Job.user_id  == current_user.id,
            Job.job_type == JobType.ai_generation,
        )
        .order_by(Job.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id":           j.id,
            "task":         j.ai_task,
            "task_display": TASK_DISPLAY.get(j.ai_task or "", j.ai_task or ""),
            "status":       j.status.value if hasattr(j.status, "value") else j.status,
            "tokens_used":  j.tokens_charged or 0,
            "model_used":   CLAUDE_MODEL,
            "created_at":   j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]


@router.post("/extract-text")
async def extract_text(
    file:         UploadFile = File(...),
    current_user: User       = Depends(get_current_user),
    db:           Session    = Depends(get_db),
):
    """Extract plain text from uploaded PDF/DOCX/TXT for AI input."""
    import io
    content  = await file.read()
    filename = (file.filename or "").lower()
    text     = ""

    try:
        if filename.endswith(".txt") or filename.endswith(".md"):
            text = content.decode("utf-8", errors="replace")

        elif filename.endswith(".pdf"):
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(content))
                text = "\n".join(p.extract_text() or "" for p in reader.pages)
            except ImportError:
                raise HTTPException(status_code=400, detail="PDF extraction not available.")

        elif filename.endswith(".docx"):
            try:
                import docx
                doc  = docx.Document(io.BytesIO(content))
                text = "\n".join(p.text for p in doc.paragraphs)
            except ImportError:
                raise HTTPException(status_code=400, detail="DOCX extraction not available.")

        else:
            raise HTTPException(status_code=400, detail="Unsupported file type for text extraction.")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Text extraction error: {e}")
        raise HTTPException(status_code=400, detail="Could not extract text from this file.")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from this file.")

    return {"text": text.strip(), "characters": len(text)}


@router.get("/status")
async def ai_status():
    return {
        "service":    "Anthropic Claude Haiku",
        "configured": bool(settings.anthropic_api_key),
        "model":      CLAUDE_MODEL,
    }