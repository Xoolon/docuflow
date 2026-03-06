"""Tests: payment endpoints — pack listing, init, verify, history"""
import pytest
from unittest.mock import patch, AsyncMock
from tests.conftest import make_user


# ── pack listing ───────────────────────────────────────────────────────────────

def test_get_packs_public(client):
    """Pack listing requires no auth."""
    r = client.get("/api/v1/payment/packs")
    assert r.status_code == 200
    data = r.json()
    assert "packs" in data
    assert len(data["packs"]) == 4
    ids = [p["id"] for p in data["packs"]]
    assert set(ids) == {"starter", "basic", "pro", "max"}


def test_pack_has_required_fields(client):
    r = client.get("/api/v1/payment/packs")
    for pack in r.json()["packs"]:
        assert "id"          in pack
        assert "label"       in pack
        assert "tokens"      in pack
        assert "price_usd"   in pack
        assert "price_kes"   in pack
        assert "price_cents" in pack
        assert pack["tokens"] > 0
        assert pack["price_kes"] > 0


def test_pack_currency_is_kes(client):
    r = client.get("/api/v1/payment/packs")
    assert r.json().get("currency") == "KES"


# ── init payment ───────────────────────────────────────────────────────────────

def test_init_requires_auth(client):
    r = client.post("/api/v1/payment/initialize/starter")
    assert r.status_code == 401


def test_init_unknown_pack(client, auth_headers):
    r = client.post("/api/v1/payment/initialize/unicorn", headers=auth_headers)
    assert r.status_code == 400


def test_init_payment_creates_pending_record(client, db, auth_headers):
    """Mock Paystack so we don't make real HTTP calls in tests."""
    mock_result = {
        "authorization_url": "https://checkout.paystack.com/test123",
        "reference":         "test_ref_123",
        "access_code":       "test123",
    }
    with patch(
        "app.api.payment.initialize_payment",
        new=AsyncMock(return_value=mock_result)
    ):
        r = client.post("/api/v1/payment/initialize/starter", headers=auth_headers)

    assert r.status_code == 200
    data = r.json()
    assert "authorization_url" in data
    assert "reference"         in data
    assert "payment_id"        in data

    # Verify DB record was created
    from app.models.models import Payment
    payment = db.query(Payment).filter_by(paystack_reference="test_ref_123").first()
    assert payment is not None
    assert payment.status  == "pending"
    assert payment.pack_id == "starter"


# ── verify payment ─────────────────────────────────────────────────────────────

def test_verify_requires_auth(client):
    r = client.get("/api/v1/payment/verify/fake_ref_123")
    assert r.status_code == 401


def test_verify_credits_tokens_on_success(client, db, auth_headers):
    """Full payment flow: pending → success → tokens credited."""
    from app.models.models import Payment, User
    from app.utils.auth import create_access_token

    user, token = make_user(db, email="verify@test.app", tokens=10_000, purchased=0)
    headers     = {"Authorization": f"Bearer {token}"}

    # 1. Create pending payment record directly
    payment = Payment(
        user_id        = user.id,
        pack_id        = "starter",
        tokens_granted = 50_000,
        amount_usd     = 2,
        amount_ngn     = 260,
        status         = "pending",
        paystack_reference = "verify_ref_001",
    )
    db.add(payment)
    db.commit()

    # 2. Mock Paystack verify as successful
    mock_verify = {
        "status":    "success",
        "amount":    26000,
        "currency":  "KES",
        "reference": "verify_ref_001",
        "metadata":  {},
        "paid_at":   "2026-03-05T12:00:00",
    }
    with patch(
        "app.api.payment.verify_payment",
        new=AsyncMock(return_value=mock_verify)
    ):
        r = client.get("/api/v1/payment/verify/verify_ref_001", headers=headers)

    assert r.status_code == 200
    data = r.json()
    assert data["status"]       == "success"
    assert data["tokens_added"] == 50_000

    # 3. Confirm balance updated
    db.refresh(user)
    assert user.tokens_balance   == 60_000   # 10k + 50k
    assert user.tokens_purchased == 50_000


def test_verify_already_processed_is_idempotent(client, db, auth_headers):
    """Calling verify twice on the same ref should be safe."""
    from app.models.models import Payment, User
    user, token = make_user(db, email="idempotent@test.app", tokens=60_000, purchased=50_000)
    headers     = {"Authorization": f"Bearer {token}"}

    payment = Payment(
        user_id        = user.id,
        pack_id        = "starter",
        tokens_granted = 50_000,
        amount_usd     = 2,
        amount_ngn     = 260,
        status         = "success",   # already processed
        paystack_reference = "already_done_ref",
    )
    db.add(payment)
    db.commit()

    mock_verify = {
        "status": "success", "amount": 26000, "currency": "KES",
        "reference": "already_done_ref", "metadata": {}, "paid_at": None,
    }
    with patch("app.api.payment.verify_payment", new=AsyncMock(return_value=mock_verify)):
        r = client.get("/api/v1/payment/verify/already_done_ref", headers=headers)

    assert r.status_code == 200
    assert r.json()["status"] == "already_processed"

    # Balance must NOT have doubled
    db.refresh(user)
    assert user.tokens_balance == 60_000


# ── payment history ────────────────────────────────────────────────────────────

def test_history_requires_auth(client):
    r = client.get("/api/v1/payment/history")
    assert r.status_code == 401


def test_history_returns_list(client, auth_headers):
    r = client.get("/api/v1/payment/history", headers=auth_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)