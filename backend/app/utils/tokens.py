"""
Token wallet — every credit change goes through here.
Positive delta = tokens added (purchase, bonus)
Negative delta = tokens spent (AI usage, conversion)
"""
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import (
    User, TokenTransaction, TokenTxType,
    TOKENS_DOC_CONVERSION, TOKENS_IMG_CONVERSION,
    ANTHROPIC_INPUT_PER_TOKEN, ANTHROPIC_OUTPUT_PER_TOKEN,
)


def _calc_api_cost(input_tokens: int, output_tokens: int) -> float:
    return (
        input_tokens  * ANTHROPIC_INPUT_PER_TOKEN +
        output_tokens * ANTHROPIC_OUTPUT_PER_TOKEN
    )


def require_tokens(user: User, needed: int):
    """Raise HTTP 402 if the user cannot afford the operation."""
    if user.tokens_balance < needed:
        raise HTTPException(
            status_code=402,
            detail={
                "error":    "insufficient_tokens",
                "message":  f"You need {needed:,} tokens but only have {user.tokens_balance:,}. Top up to continue.",
                "balance":  user.tokens_balance,
                "required": needed,
            },
        )


def deduct_tokens(
    db: Session,
    user: User,
    amount: int,
    tx_type: TokenTxType,
    description: str = "",
    job_id: str = None,
    input_tokens: int = None,
    output_tokens: int = None,
) -> TokenTransaction:
    require_tokens(user, amount)
    user.tokens_balance  -= amount
    user.tokens_consumed += amount
    api_cost = (
        _calc_api_cost(input_tokens or 0, output_tokens or 0)
        if input_tokens is not None else None
    )
    tx = TokenTransaction(
        user_id       = user.id,
        tx_type       = tx_type,
        tokens_delta  = -amount,
        tokens_after  = user.tokens_balance,
        input_tokens  = input_tokens,
        output_tokens = output_tokens,
        api_cost_usd  = api_cost,
        job_id        = job_id,
        description   = description,
    )
    db.add(tx)
    db.commit()
    db.refresh(user)
    return tx


def credit_tokens(
    db: Session,
    user: User,
    amount: int,
    tx_type: TokenTxType,
    description: str = "",
    payment_id: str = None,
) -> TokenTransaction:
    user.tokens_balance += amount
    if tx_type == TokenTxType.purchase:
        user.tokens_purchased += amount
    tx = TokenTransaction(
        user_id      = user.id,
        tx_type      = tx_type,
        tokens_delta = amount,
        tokens_after = user.tokens_balance,
        payment_id   = payment_id,
        description  = description,
    )
    db.add(tx)
    db.commit()
    db.refresh(user)
    return tx


def deduct_doc_conversion(db: Session, user: User, job_id: str = None) -> int:
    deduct_tokens(
        db, user, TOKENS_DOC_CONVERSION,
        TokenTxType.doc_conversion,
        "Document conversion",
        job_id,
    )
    return TOKENS_DOC_CONVERSION


def deduct_img_conversion(db: Session, user: User, job_id: str = None) -> int:
    deduct_tokens(
        db, user, TOKENS_IMG_CONVERSION,
        TokenTxType.img_conversion,
        "Image conversion",
        job_id,
    )
    return TOKENS_IMG_CONVERSION


def deduct_ai_usage(
    db: Session,
    user: User,
    input_tokens: int,
    output_tokens: int,
    job_id: str = None,
    task: str = "",
) -> dict:
    total = input_tokens + output_tokens
    deduct_tokens(
        db, user, total,
        TokenTxType.ai_usage,
        f"AI: {task}",
        job_id        = job_id,
        input_tokens  = input_tokens,
        output_tokens = output_tokens,
    )
    return {
        "tokens_charged": total,
        "api_cost_usd":   _calc_api_cost(input_tokens, output_tokens),
        "balance_after":  user.tokens_balance,
    }