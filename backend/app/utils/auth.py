"""
JWT auth helpers + Google OAuth user resolution.
"""
from datetime import datetime, timedelta
from typing import Optional

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import (
    User, TokenTransaction, TokenTxType, FREE_SIGNUP_TOKENS
)

security = HTTPBearer()


# ── JWT ────────────────────────────────────────────────────────────────────────

def create_access_token(user_id: str) -> str:
    expire  = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.jwt_algorithm]
        )
        return payload.get("sub")
    except JWTError:
        return None


# ── FastAPI dependency ─────────────────────────────────────────────────────────

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    user_id = decode_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(User).filter(
        User.id == user_id, User.is_active == True
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Google helpers ─────────────────────────────────────────────────────────────

async def get_google_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=400, detail="Failed to fetch Google user info"
        )
    return resp.json()


def get_or_create_user(
    db: Session,
    email: str,
    name: str,
    avatar_url: str,
    provider: str,
    provider_id: str,
) -> User:
    """Return existing user (updating profile) or create new with signup bonus."""
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.name       = name
        user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)
        return user

    # Brand-new user
    user = User(
        email       = email,
        name        = name,
        avatar_url  = avatar_url,
        provider    = provider,
        provider_id = provider_id,
        tokens_balance = FREE_SIGNUP_TOKENS,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Record the signup bonus in the ledger
    tx = TokenTransaction(
        user_id      = user.id,
        tx_type      = TokenTxType.signup_bonus,
        tokens_delta = FREE_SIGNUP_TOKENS,
        tokens_after = FREE_SIGNUP_TOKENS,
        description  = "Welcome gift — free tokens on signup",
    )
    db.add(tx)
    db.commit()
    return user