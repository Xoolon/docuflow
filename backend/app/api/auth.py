"""
Auth API — Google OAuth 2.0
"""
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.models import User
from app.utils.auth import (
    create_access_token,
    get_current_user,
    get_google_user_info,
    get_or_create_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"


class GoogleCallbackRequest(BaseModel):
    code: str
    redirect_uri: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


def _user_dict(u: User) -> dict:
    return {
        "id":               u.id,
        "email":            u.email,
        "name":             u.name,
        "avatar_url":       u.avatar_url,
        "tokens_balance":   u.tokens_balance,
        "tokens_consumed":  u.tokens_consumed,
        "tokens_purchased": u.tokens_purchased,
        "is_admin":         u.is_admin,
        "created_at":       u.created_at.isoformat(),
    }


@router.get("/google/url")
async def google_auth_url(redirect_uri: str):
    params = {
        "client_id":     settings.google_client_id,
        "redirect_uri":  redirect_uri,
        "response_type": "code",
        "scope":         "openid email profile",
        "access_type":   "offline",
    }
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    return {"url": f"{GOOGLE_AUTH_URL}?{qs}"}


@router.post("/google/callback", response_model=TokenResponse)
async def google_callback(
    body: GoogleCallbackRequest,
    db: Session = Depends(get_db),
):
    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code":          body.code,
                "client_id":     settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri":  body.redirect_uri,
                "grant_type":    "authorization_code",
            },
        )

    if token_resp.status_code != 200:
        raise HTTPException(
            status_code=400, detail="Failed to exchange Google code"
        )

    google_access_token = token_resp.json().get("access_token")
    user_info = await get_google_user_info(google_access_token)
    user = get_or_create_user(
        db          = db,
        email       = user_info["email"],
        name        = user_info.get("name", ""),
        avatar_url  = user_info.get("picture", ""),
        provider    = "google",
        provider_id = user_info["id"],
    )
    return TokenResponse(
        access_token = create_access_token(user.id),
        user         = _user_dict(user),
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Logged out successfully"}


@router.post("/bootstrap-admin")
async def bootstrap_admin(
    email:  str,
    secret: str,
    db:     Session = Depends(get_db),
):
    """
    One-time endpoint to grant admin to the first user.
    Protected by SECRET_KEY — unusable without it.
    Call:  POST /api/v1/auth/bootstrap-admin?email=you@example.com&secret=YOUR_SECRET_KEY
    Safe to leave deployed — wrong secret = 403.
    """
    # Must match the SECRET_KEY env var exactly
    if secret != settings.secret_key:
        raise HTTPException(status_code=403, detail="Invalid secret")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # List all emails so caller knows what exists
        all_emails = [u.email for u in db.query(User.email).all()]
        raise HTTPException(
            status_code=404,
            detail=f"No user with email '{email}'. Registered: {all_emails}",
        )

    user.is_admin = True
    db.commit()
    return {
        "ok":       True,
        "email":    user.email,
        "name":     user.name,
        "is_admin": user.is_admin,
        "message":  f"Admin granted to {user.email}. Log out and back in to activate.",
    }