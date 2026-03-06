# rate_limit.py — replaced by token wallet system in v2
# All limits are now enforced via app/utils/tokens.py
# This file is kept so any lingering imports don't cause AttributeErrors.

from sqlalchemy.orm import Session
from app.models.models import User


def check_conversion_limit(db: Session, user: User):
    pass  # No-op — token system handles limits


def check_ai_limit(db: Session, user: User):
    pass  # No-op — token system handles limits


def increment_conversion_count(db: Session, user_id: str):
    pass  # No-op — token deduction is the record now


def increment_ai_count(db: Session, user_id: str):
    pass  # No-op


def get_ai_token_limit(user: User) -> int:
    return user.tokens_balance  # balance IS the limit now


def get_daily_usage(db: Session, user_id: str):
    return None  # No longer used