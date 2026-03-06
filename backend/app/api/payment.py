"""
Payment API v2 — token credit pack purchases via Paystack (KES)
"""
import json
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from loguru import logger

from app.config import settings
from app.database import get_db
from app.models.models import Payment, User, CREDIT_PACKS, TokenTxType
from app.services.paystack import (
    initialize_payment,
    verify_payment,
    verify_webhook_signature,
)
from app.utils.auth import get_current_user
from app.utils.tokens import credit_tokens

router = APIRouter(prefix="/payment", tags=["payment"])


@router.get("/packs")
async def get_packs():
    """Return available token packs — no auth required so the pricing page works."""
    return {
        "packs": [
            {
                "id":            pid,
                "label":         p["label"],
                "tokens":        p["tokens"],
                "price_usd":     p["price_usd"],
                "price_kes":     p["price_kes"],
                "price_cents":   int(p["price_kes"] * 100),   # KES in cents for Paystack
                "per_token_usd": round(p["price_usd"] / p["tokens"], 8),
                "popular":       pid == "pro",
            }
            for pid, p in CREDIT_PACKS.items()
        ],
        "currency":            "KES",
        "free_on_signup":      10_000,
        "doc_conversion_cost": 500,
        "img_conversion_cost": 200,
    }


@router.post("/initialize/{pack_id}")
async def init_payment(
    pack_id:      str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Start a Paystack checkout for the chosen credit pack."""
    if pack_id not in CREDIT_PACKS:
        raise HTTPException(status_code=400, detail=f"Unknown pack: {pack_id}")
    if not settings.paystack_secret_key:
        raise HTTPException(
            status_code=503,
            detail="Payments are not configured yet. Add PAYSTACK_SECRET_KEY to your .env file.",
        )

    pack = CREDIT_PACKS[pack_id]

    # Create pending payment record
    payment = Payment(
        user_id        = current_user.id,
        pack_id        = pack_id,
        tokens_granted = pack["tokens"],
        amount_usd     = pack["price_usd"],
        amount_ngn     = pack["price_kes"],   # reusing amount_ngn column for local currency
        status         = "pending",
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    try:
        result = await initialize_payment(
            email       = current_user.email,
            user_id     = current_user.id,
            amount_kobo = int(pack["price_kes"] * 100),  # KES in cents
            metadata    = {
                "pack_id":       pack_id,
                "tokens":        pack["tokens"],
                "payment_db_id": payment.id,
            },
        )
        payment.paystack_reference = result["reference"]
        db.commit()

        return {
            **result,
            "pack":       pack,
            "payment_id": payment.id,
        }

    except Exception as e:
        payment.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verify/{reference}")
async def verify(
    reference:    str,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Called by the frontend after Paystack redirects back.
    Verifies the payment and credits tokens to the user's wallet.
    """
    try:
        result = await verify_payment(reference)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if result["status"] != "success":
        return {
            "status":  result["status"],
            "message": "Payment was not completed successfully.",
        }

    payment = db.query(Payment).filter(
        Payment.paystack_reference == reference
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.status == "success":
        return {
            "status":      "already_processed",
            "message":     "Tokens were already added to your account.",
            "new_balance": current_user.tokens_balance,
        }

    payment.status = "success"
    db.commit()

    credit_tokens(
        db, current_user,
        amount      = payment.tokens_granted,
        tx_type     = TokenTxType.purchase,
        description = f"Purchased {CREDIT_PACKS[payment.pack_id]['label']} pack",
        payment_id  = payment.id,
    )

    return {
        "status":       "success",
        "tokens_added": payment.tokens_granted,
        "new_balance":  current_user.tokens_balance,
        "message":      f"✅ {payment.tokens_granted:,} tokens added to your account!",
    }


@router.post("/webhook")
async def webhook(
    request: Request,
    db:      Session = Depends(get_db),
    x_paystack_signature: Optional[str] = Header(None),
):
    """
    Paystack webhook — backup credit grant in case the frontend redirect fails.
    Configure this URL in your Paystack dashboard:
    https://your-backend-domain.com/api/v1/payment/webhook
    """
    body = await request.body()

    if not x_paystack_signature:
        raise HTTPException(status_code=400, detail="Missing Paystack-Signature header")

    if not verify_webhook_signature(body, x_paystack_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        event = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    if event.get("event") == "charge.success":
        data      = event["data"]
        reference = data["reference"]

        payment = db.query(Payment).filter(
            Payment.paystack_reference == reference
        ).first()

        if payment and payment.status != "success":
            payment.status = "success"
            db.commit()

            user = db.query(User).filter(User.id == payment.user_id).first()
            if user:
                credit_tokens(
                    db, user,
                    amount      = payment.tokens_granted,
                    tx_type     = TokenTxType.purchase,
                    description = f"Webhook: {payment.pack_id} pack",
                    payment_id  = payment.id,
                )
                logger.info(
                    f"Webhook credited {payment.tokens_granted:,} tokens → {user.email}"
                )

    return {"status": "ok"}


@router.get("/history")
async def payment_history(
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """Return the current user's payment history."""
    payments = (
        db.query(Payment)
        .filter(Payment.user_id == current_user.id)
        .order_by(Payment.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id":         p.id,
            "pack_id":    p.pack_id,
            "label":      CREDIT_PACKS.get(p.pack_id, {}).get("label", p.pack_id),
            "tokens":     p.tokens_granted,
            "amount_kes": p.amount_ngn,   # stored in amount_ngn column
            "amount_usd": p.amount_usd,
            "status":     p.status,
            "created_at": p.created_at.isoformat(),
        }
        for p in payments
    ]