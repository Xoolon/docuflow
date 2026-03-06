"""
Paste this at the top of your uvicorn terminal session to see EXACTLY
what payload is being sent to Paystack.

Run:  python test_paystack_live.py
"""
import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))

import httpx
from app.config import settings

async def main():
    print("=" * 60)
    print("Paystack Live Payload Test")
    print("=" * 60)
    print(f"Key:              {settings.paystack_secret_key[:12]}...{settings.paystack_secret_key[-4:]}")
    print(f"paystack_currency setting: '{settings.paystack_currency}'")
    print()

    # Reproduce exactly what payment.py sends
    pack = {"price_kes": 260, "tokens": 50_000}
    amount_kobo = int(pack["price_kes"] * 100)

    payload = {
        "email":        "test@docuflow.app",
        "amount":       amount_kobo,
        "callback_url": f"{settings.frontend_url}/payment/verify",
        "metadata":     {"pack_id": "starter", "tokens": pack["tokens"], "user_id": "test-user"},
    }
    if settings.paystack_currency:
        payload["currency"] = settings.paystack_currency

    print("Payload being sent:")
    print(json.dumps(payload, indent=2))
    print()

    headers = {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type":  "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.paystack.co/transaction/initialize",
            headers=headers,
            json=payload,
        )

    print(f"HTTP status: {resp.status_code}")
    print("Paystack response:")
    print(json.dumps(resp.json(), indent=2))

asyncio.run(main())