"""
Run this to check what your Paystack account supports:
  python check_paystack.py
"""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))

import httpx
from app.config import settings

async def main():
    headers = {
        "Authorization": f"Bearer {settings.paystack_secret_key}",
        "Content-Type": "application/json",
    }

    print(f"Using key: {settings.paystack_secret_key[:8]}...{settings.paystack_secret_key[-4:]}")
    print(f"Key type: {'TEST' if 'test' in settings.paystack_secret_key.lower() else 'LIVE'}")
    print()

    async with httpx.AsyncClient(timeout=10) as client:
        # Check account integration details
        resp = await client.get(
            "https://api.paystack.co/integration/payment_providers",
            headers=headers,
        )
        print(f"Payment providers status: {resp.status_code}")
        if resp.status_code == 200:
            print(resp.json())

        print()

        # Try initializing with NO currency (account default)
        resp2 = await client.post(
            "https://api.paystack.co/transaction/initialize",
            headers=headers,
            json={
                "email": "test@test.com",
                "amount": 10000,  # 100 KES / NGN in cents
            }
        )
        print(f"Init without currency: {resp2.status_code}")
        print(resp2.json())

asyncio.run(main())