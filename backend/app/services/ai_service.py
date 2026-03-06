"""
DocuFlow AI Service
Uses claude-haiku-4-5-20251001 — Anthropic's cheapest production model.
Token limits are enforced here before calling the API to control costs.
"""
from typing import Optional

import anthropic
from loguru import logger

from app.config import settings

# Lazily initialised so we don't crash on startup if key is empty
_client: Optional[anthropic.Anthropic] = None

AI_MODEL = "claude-haiku-4-5-20251001"

class InsufficientCreditsError(Exception):
    """Raised when the Anthropic account has insufficient credits."""
    pass

SYSTEM_PROMPTS = {
    "generate": (
        "You are DocuFlow's expert document writer. Create professional, "
        "well-structured documents from the user's description. "
        "Output clean, formatted plain text ready to use. Be thorough but concise."
    ),
    "improve": (
        "You are DocuFlow's writing enhancement specialist. Improve the provided "
        "text for clarity, flow, and impact while keeping the original meaning intact. "
        "Return only the improved text — no commentary."
    ),
    "professional": (
        "You are a professional business writer. Rewrite the provided text in "
        "polished, formal language suitable for business communication. "
        "Preserve the core message; elevate tone and structure."
    ),
    "ats": (
        "You are an expert resume/CV optimiser. Rewrite the provided document to "
        "maximise ATS (Applicant Tracking System) compatibility. Use clear section "
        "headers (EXPERIENCE, EDUCATION, SKILLS, SUMMARY), industry keywords, "
        "and quantified achievements where possible."
    ),
    "summarize": (
        "You are DocuFlow's summarisation engine. Produce a clear, concise summary "
        "of the provided text. Capture all key points and essential information. "
        "Aim for roughly 20% of the original length."
    ),
    "reformat": (
        "You are DocuFlow's document formatter. Restructure and reformat the "
        "provided text with clean headings, logical flow, and consistent style. "
        "Preserve all content; improve readability."
    ),
}

TASK_LABELS = {
    "generate": "Generate Document",
    "improve": "Improve Writing",
    "professional": "Make Professional",
    "ats": "Optimize for ATS",
    "summarize": "Summarize",
    "reformat": "Reformat Cleanly",
}


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is not set in your .env.frontend file.")
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def count_tokens_approx(text: str) -> int:
    """Rough estimate: 1 token ≈ 4 characters."""
    return max(1, len(text) // 4)


def build_prompt(
    task: str,
    user_input: str,
    format_spec: Optional[str] = None,
    document_type: Optional[str] = None,
) -> str:
    context_lines = []
    if document_type:
        context_lines.append(f"Document type: {document_type}")
    if format_spec:
        context_lines.append(f"Format requirements: {format_spec}")

    context_block = "\n".join(context_lines)

    if task == "generate":
        return (
            f"{context_block + chr(10) if context_block else ''}"
            f"Description:\n{user_input}\n\n"
            "Generate a complete, well-structured document based on the above."
        )

    return (
        f"{context_block + chr(10) if context_block else ''}"
        f"Text:\n{user_input}"
    )


async def process_document(
    task: str,
    user_input: str,
    max_input_tokens: int,
    format_spec: Optional[str] = None,
    document_type: Optional[str] = None,
) -> dict:
    """
    Call the Anthropic API for the given task.
    Returns a dict with 'result', 'input_tokens', 'output_tokens', etc.
    Raises ValueError for bad input, RuntimeError for API errors.
    """
    if task not in SYSTEM_PROMPTS:
        raise ValueError(f"Unknown task '{task}'. Valid: {list(SYSTEM_PROMPTS)}")

    approx = count_tokens_approx(user_input)
    if approx > max_input_tokens:
        raise ValueError(
            f"Input too long (~{approx} tokens). "
            f"Your plan allows up to {max_input_tokens} tokens "
            f"(~{int(max_input_tokens * 0.75)} words)."
        )

    prompt = build_prompt(task, user_input, format_spec, document_type)

    try:
        client = _get_client()
        response = client.messages.create(
            model=AI_MODEL,
            max_tokens=2048,
            system=SYSTEM_PROMPTS[task],
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = response.content[0].text

        return {
            "result": result_text,
            "task": task,
            "task_display": TASK_LABELS.get(task, task),
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "model": AI_MODEL,
        }


    except anthropic.APIStatusError as e:

        logger.error(f"Anthropic API status error: {e.status_code} — {e.message}")

        # Check for low‑balance message (Anthropic returns 400 with that specific message)

        if e.status_code == 400 and "credit balance is too low" in e.message:

            raise InsufficientCreditsError("Insufficient Anthropic credits. Please add funds.")

        else:

            raise RuntimeError(f"AI service error ({e.status_code}): {e.message}")
    except anthropic.APIConnectionError:
        raise RuntimeError("Could not connect to AI service. Please check your internet connection.")
    except RuntimeError:
        raise
    except Exception as e:
        logger.error(f"Unexpected AI error: {e}")
        raise RuntimeError("An unexpected error occurred with the AI service.")


def get_word_limit_display(max_tokens: int) -> dict:
    return {
        "max_tokens": max_tokens,
        "approx_words": int(max_tokens * 0.75),
        "approx_chars": max_tokens * 4,
    }