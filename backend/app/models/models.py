"""
DocuFlow Database Models — v2 Token System
Run after changes:
  PowerShell: Get-ChildItem -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force
"""
import enum as python_enum
import uuid

from sqlalchemy import (
    Column, String, Integer, BigInteger, Boolean,
    DateTime, Text, Float, ForeignKey
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


# ─── Constants ────────────────────────────────────────────────────────────────

FREE_SIGNUP_TOKENS = 10_000

# Anthropic claude-haiku-4-5 pricing (USD per token)
ANTHROPIC_INPUT_PER_TOKEN  = 0.80  / 1_000_000   # $0.80 / 1M input tokens
ANTHROPIC_OUTPUT_PER_TOKEN = 4.00  / 1_000_000   # $4.00 / 1M output tokens

TOKENS_DOC_CONVERSION = 500
TOKENS_IMG_CONVERSION = 200

CREDIT_PACKS = {
    "starter": {"label": "Starter", "tokens": 50_000,    "price_usd": 2,  "price_kes": 260},
    "basic":   {"label": "Basic",   "tokens": 150_000,   "price_usd": 5,  "price_kes": 650},
    "pro":     {"label": "Pro",     "tokens": 400_000,   "price_usd": 12, "price_kes": 1_560},
    "max":     {"label": "Max",     "tokens": 1_000_000, "price_usd": 25, "price_kes": 3_250},
}


# ─── Enums ────────────────────────────────────────────────────────────────────

class JobStatus(str, python_enum.Enum):
    pending    = "pending"
    processing = "processing"
    completed  = "completed"
    failed     = "failed"


class JobType(str, python_enum.Enum):
    conversion    = "conversion"
    ai_generation = "ai_generation"


class TokenTxType(str, python_enum.Enum):
    signup_bonus   = "signup_bonus"
    purchase       = "purchase"
    doc_conversion = "doc_conversion"
    img_conversion = "img_conversion"
    ai_usage       = "ai_usage"
    admin_grant    = "admin_grant"
    refund         = "refund"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id          = Column(String, primary_key=True, default=gen_uuid)
    email       = Column(String, unique=True, index=True, nullable=False)
    name        = Column(String, nullable=True)
    avatar_url  = Column(String, nullable=True)
    provider    = Column(String, nullable=True)
    provider_id = Column(String, unique=True, nullable=True)
    is_active   = Column(Boolean, default=True,  nullable=False)
    is_admin    = Column(Boolean, default=False, nullable=False)

    # Token wallet
    tokens_balance   = Column(BigInteger, default=FREE_SIGNUP_TOKENS, nullable=False)
    tokens_purchased = Column(BigInteger, default=0,                  nullable=False)
    tokens_consumed  = Column(BigInteger, default=0,                  nullable=False)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    jobs          = relationship("Job",              back_populates="user", lazy="select")
    payments      = relationship("Payment",          back_populates="user", lazy="select")
    transactions  = relationship("TokenTransaction", back_populates="user", lazy="select")


class TokenTransaction(Base):
    """Immutable ledger — every token change recorded here."""
    __tablename__ = "token_transactions"

    id           = Column(String,  primary_key=True, default=gen_uuid)
    user_id      = Column(String,  ForeignKey("users.id"), nullable=False)
    tx_type      = Column(SAEnum(TokenTxType), nullable=False)
    tokens_delta = Column(BigInteger, nullable=False)   # positive=credit, negative=debit
    tokens_after = Column(BigInteger, nullable=False)   # balance after this tx
    input_tokens = Column(Integer,  nullable=True)      # Anthropic input tokens (AI jobs only)
    output_tokens= Column(Integer,  nullable=True)      # Anthropic output tokens
    api_cost_usd = Column(Float,    nullable=True)      # exact Anthropic cost
    job_id       = Column(String,   nullable=True)
    payment_id   = Column(String,   nullable=True)
    description  = Column(String,   nullable=True)
    created_at   = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="transactions")


class Job(Base):
    __tablename__ = "jobs"

    id                = Column(String,  primary_key=True, default=gen_uuid)
    user_id           = Column(String,  ForeignKey("users.id"), nullable=False)
    job_type          = Column(SAEnum(JobType),   nullable=False)
    status            = Column(SAEnum(JobStatus), default=JobStatus.pending, nullable=False)
    original_filename = Column(String,  nullable=True)
    input_format      = Column(String,  nullable=True)
    output_format     = Column(String,  nullable=True)
    input_file_key    = Column(String,  nullable=True)
    output_file_key   = Column(String,  nullable=True)
    file_size_bytes   = Column(Integer, nullable=True)
    watermarked       = Column(Boolean, default=False)

    # AI fields
    ai_task           = Column(String,  nullable=True)
    ai_prompt         = Column(Text,    nullable=True)
    ai_result         = Column(Text,    nullable=True)
    input_tokens      = Column(Integer, nullable=True)
    output_tokens     = Column(Integer, nullable=True)
    total_tokens      = Column(Integer, nullable=True)
    tokens_charged    = Column(Integer, nullable=True)
    api_cost_usd      = Column(Float,   nullable=True)

    error_message     = Column(Text,    nullable=True)
    created_at        = Column(DateTime, server_default=func.now())
    completed_at      = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="jobs")


class Payment(Base):
    __tablename__ = "payments"

    id                 = Column(String, primary_key=True, default=gen_uuid)
    user_id            = Column(String, ForeignKey("users.id"), nullable=False)
    pack_id            = Column(String, nullable=True)
    paystack_reference = Column(String, unique=True, nullable=True)
    tokens_granted     = Column(BigInteger, default=0)
    amount_usd         = Column(Float,  nullable=True)
    amount_ngn         = Column(Float,  nullable=True)
    status             = Column(String, default="pending")
    created_at         = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="payments")