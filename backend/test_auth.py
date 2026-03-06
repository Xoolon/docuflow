"""Tests: auth endpoints — /auth/me, /auth/logout, token validation"""
import pytest
from tests.conftest import make_user


def test_me_unauthenticated(client):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_authenticated(client, db, auth_headers):
    r = client.get("/api/v1/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "test@docuflow.app"
    assert "tokens_balance" in data
    assert "tokens_consumed" in data
    assert "is_admin" in data


def test_me_returns_token_fields(client, db, auth_headers):
    r = client.get("/api/v1/auth/me", headers=auth_headers)
    data = r.json()
    assert isinstance(data["tokens_balance"],   int)
    assert isinstance(data["tokens_purchased"], int)
    assert isinstance(data["tokens_consumed"],  int)
    assert isinstance(data["is_admin"],         bool)


def test_me_invalid_token(client):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer totally-fake-token"})
    assert r.status_code == 401


def test_me_malformed_bearer(client):
    r = client.get("/api/v1/auth/me", headers={"Authorization": "NotBearer abc123"})
    assert r.status_code == 401


def test_logout(client, auth_headers):
    r = client.post("/api/v1/auth/logout", headers=auth_headers)
    assert r.status_code == 200


def test_new_user_gets_free_tokens(client, db):
    from app.models.models import FREE_SIGNUP_TOKENS
    user, token = make_user(db, email="newuser@docuflow.app", tokens=FREE_SIGNUP_TOKENS)
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/v1/auth/me", headers=headers)
    assert r.status_code == 200
    assert r.json()["tokens_balance"] == FREE_SIGNUP_TOKENS


def test_google_url_endpoint(client):
    r = client.get("/api/v1/auth/google/url?redirect_uri=http://localhost:5173/login")
    assert r.status_code == 200
    assert "url" in r.json()
    assert "accounts.google.com" in r.json()["url"]