"""Tests: token wallet — credit, deduct, require, balance enforcement"""
import pytest
from fastapi import HTTPException
from tests.conftest import make_user
from app.utils.tokens import (
    credit_tokens, deduct_tokens, require_tokens,
    deduct_doc_conversion, deduct_img_conversion,
)
from app.models.models import TokenTxType, TOKENS_DOC_CONVERSION, TOKENS_IMG_CONVERSION


def test_credit_increases_balance(db):
    user, _ = make_user(db, email="credit@test.app", tokens=0)
    credit_tokens(db, user, 5000, TokenTxType.signup_bonus, "Test credit")
    assert user.tokens_balance == 5000


def test_purchase_credit_increments_purchased(db):
    user, _ = make_user(db, email="purchase@test.app", tokens=0)
    credit_tokens(db, user, 50_000, TokenTxType.purchase, "Pack purchase", payment_id="pay_test")
    assert user.tokens_balance   == 50_000
    assert user.tokens_purchased == 50_000


def test_deduct_decreases_balance(db):
    user, _ = make_user(db, email="deduct@test.app", tokens=10_000)
    deduct_tokens(db, user, 500, TokenTxType.doc_conversion, "Test deduct")
    assert user.tokens_balance  == 9_500
    assert user.tokens_consumed == 500


def test_require_tokens_raises_on_insufficient(db):
    user, _ = make_user(db, email="broke@test.app", tokens=100)
    with pytest.raises(HTTPException) as exc:
        require_tokens(user, 500)
    assert exc.value.status_code == 402
    assert exc.value.detail["error"] == "insufficient_tokens"


def test_require_tokens_passes_on_sufficient(db):
    user, _ = make_user(db, email="rich@test.app", tokens=10_000)
    require_tokens(user, 500)  # Should not raise


def test_doc_conversion_deducts_500(db):
    user, _ = make_user(db, email="doc@test.app", tokens=10_000)
    deduct_doc_conversion(db, user)
    assert user.tokens_balance == 10_000 - TOKENS_DOC_CONVERSION


def test_img_conversion_deducts_200(db):
    user, _ = make_user(db, email="img@test.app", tokens=10_000)
    deduct_img_conversion(db, user)
    assert user.tokens_balance == 10_000 - TOKENS_IMG_CONVERSION


def test_cannot_deduct_below_zero(db):
    user, _ = make_user(db, email="empty@test.app", tokens=300)
    with pytest.raises(HTTPException) as exc:
        deduct_tokens(db, user, 500, TokenTxType.doc_conversion, "Over budget")
    assert exc.value.status_code == 402


def test_token_transaction_recorded(db):
    from app.models.models import TokenTransaction
    user, _ = make_user(db, email="txlog@test.app", tokens=5_000)
    deduct_doc_conversion(db, user, job_id="job-test-123")
    txs = db.query(TokenTransaction).filter_by(user_id=user.id).all()
    assert len(txs) == 1
    assert txs[0].tokens_delta == -TOKENS_DOC_CONVERSION
    assert txs[0].tokens_after == 5_000 - TOKENS_DOC_CONVERSION