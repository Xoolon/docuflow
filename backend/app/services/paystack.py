"""
Paystack payment integration v2 — credit pack purchases.
Headers are built per-request so the secret key is always fresh from .env.
"""
import hashlib
import hmac

import httpx
from loguru import logger

from app.config import settings

PAYSTACK_BASE = "https://api.paystack.co"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type":  "application/json",
    }


async def initialize_payment(
    email: str,
    user_id: str,
    amount_kobo: int,
    metadata: dict = None,
) -> dict:
    """
    Create a Paystack transaction and return the checkout URL.
    amount_kobo: price in kobo (NGN * 100).
    metadata: arbitrary dict stored with the transaction.
    """
    payload = {
        "email":        email,
        "amount":       amount_kobo,
        "callback_url": f"{settings.frontend_url}/payment/verify",
        "metadata":     {**(metadata or {}), "user_id": user_id},
    }
    # Only send currency if explicitly configured — otherwise Paystack uses account default
    if settings.paystack_currency:
        payload["currency"] = settings.paystack_currency

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PAYSTACK_BASE}/transaction/initialize",
            headers = _headers(),
            json    = payload,
        )

    if resp.status_code != 200:
        logger.error(f"Paystack init failed: {resp.text}")
        raise RuntimeError("Payment initialisation failed. Check your Paystack secret key.")

    data = resp.json()["data"]
    return {
        "authorization_url": data["authorization_url"],
        "reference":         data["reference"],
        "access_code":       data["access_code"],
    }


async def verify_payment(reference: str) -> dict:
    """Verify a Paystack transaction by its reference string."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{PAYSTACK_BASE}/transaction/verify/{reference}",
            headers = _headers(),
        )

    if resp.status_code != 200:
        logger.error(f"Paystack verify failed: {resp.text}")
        raise RuntimeError("Payment verification failed.")

    data = resp.json()["data"]
    return {
        "status":    data["status"],        # "success" | "failed" | "abandoned"
        "amount":    data["amount"],         # in kobo
        "currency":  data["currency"],
        "reference": data["reference"],
        "metadata":  data.get("metadata", {}),
        "paid_at":   data.get("paid_at"),
    }


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify Paystack webhook HMAC-SHA512 signature."""
    expected = hmac.new(
        settings.paystack_secret_key.encode("utf-8"),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)