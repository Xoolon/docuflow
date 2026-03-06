"""Tests: database models and CREDIT_PACKS sanity checks."""
import pytest
from app.models.models import (
    CREDIT_PACKS, FREE_SIGNUP_TOKENS,
    ANTHROPIC_INPUT_PER_TOKEN, ANTHROPIC_OUTPUT_PER_TOKEN,
    TOKENS_DOC_CONVERSION, TOKENS_IMG_CONVERSION,
    User, Job, Payment, TokenTransaction,
    JobStatus, JobType, TokenTxType,
)


def test_credit_packs_have_required_keys():
    required = {"label", "tokens", "price_usd", "price_kes"}
    for pack_id, pack in CREDIT_PACKS.items():
        assert required.issubset(pack.keys()), f"{pack_id} missing keys"


def test_credit_packs_prices_are_positive():
    for pack_id, pack in CREDIT_PACKS.items():
        assert pack["tokens"]    > 0, f"{pack_id} tokens <= 0"
        assert pack["price_usd"] > 0, f"{pack_id} price_usd <= 0"
        assert pack["price_kes"] > 0, f"{pack_id} price_kes <= 0"


def test_credit_packs_margin_is_positive():
    """Each pack must generate positive margin over Anthropic API cost at 100% AI usage."""
    KES_PER_USD = 130  # conservative rate
    for pack_id, pack in CREDIT_PACKS.items():
        max_api_cost = pack["tokens"] * max(ANTHROPIC_INPUT_PER_TOKEN, ANTHROPIC_OUTPUT_PER_TOKEN)
        revenue_usd  = pack["price_kes"] / KES_PER_USD
        margin       = revenue_usd - max_api_cost
        assert margin > 0, f"{pack_id} has negative margin: ${margin:.4f}"


def test_free_signup_tokens_are_reasonable():
    assert FREE_SIGNUP_TOKENS >= 1_000
    assert FREE_SIGNUP_TOKENS <= 100_000


def test_doc_conversion_costs_more_than_img():
    assert TOKENS_DOC_CONVERSION > TOKENS_IMG_CONVERSION


def test_anthropic_pricing_constants():
    assert ANTHROPIC_INPUT_PER_TOKEN  > 0
    assert ANTHROPIC_OUTPUT_PER_TOKEN > 0
    assert ANTHROPIC_OUTPUT_PER_TOKEN > ANTHROPIC_INPUT_PER_TOKEN  # output always costs more


def test_job_status_enum_values():
    assert JobStatus.pending    == "pending"
    assert JobStatus.processing == "processing"
    assert JobStatus.completed  == "completed"
    assert JobStatus.failed     == "failed"


def test_token_tx_type_enum_values():
    expected = {"signup_bonus", "purchase", "doc_conversion", "img_conversion", "ai_usage", "admin_grant", "refund"}
    actual   = {e.value for e in TokenTxType}
    assert expected.issubset(actual)


def test_user_model_has_required_columns():
    cols = {c.key for c in User.__table__.columns}
    required = {"id", "email", "tokens_balance", "tokens_purchased", "tokens_consumed", "is_admin"}
    assert required.issubset(cols)


def test_job_model_has_required_columns():
    cols = {c.key for c in Job.__table__.columns}
    required = {"id", "user_id", "input_file_key", "tokens_charged", "watermarked"}
    assert required.issubset(cols)


def test_payment_model_has_required_columns():
    cols = {c.key for c in Payment.__table__.columns}
    required = {"id", "user_id", "pack_id", "tokens_granted", "amount_ngn", "status"}
    assert required.issubset(cols)