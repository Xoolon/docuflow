"""
Shared fixtures for all tests.
Uses SQLite in-memory DB — no Postgres needed to run tests.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Point at SQLite before importing anything that touches the DB
os.environ.setdefault("DATABASE_URL",        "sqlite:///./test.db")
os.environ.setdefault("SECRET_KEY",          "test-secret-key-32-chars-minimum-x")
os.environ.setdefault("GOOGLE_CLIENT_ID",    "test-google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET","test-google-client-secret")
os.environ.setdefault("ANTHROPIC_API_KEY",   "test-anthropic-key")
os.environ.setdefault("PAYSTACK_SECRET_KEY", "test-paystack-key")
os.environ.setdefault("FRONTEND_URL",        "http://localhost:5173")
os.environ.setdefault("APP_ENV",             "test")

from app.database import Base, get_db
from app.main import app
from app.models.models import User, FREE_SIGNUP_TOKENS
from app.utils.auth import create_access_token
from app.utils.tokens import credit_tokens
from app.models.models import TokenTxType

TEST_DB_URL = "sqlite:///./test.db"

engine_test = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    Base.metadata.create_all(bind=engine_test)
    yield
    Base.metadata.drop_all(bind=engine_test)
    if os.path.exists("test.db"):
        os.remove("test.db")


@pytest.fixture()
def db():
    connection  = engine_test.connect()
    transaction = connection.begin()
    session     = TestingSession(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


def make_user(db, email="test@docuflow.app", tokens=10_000, purchased=0, is_admin=False):
    """Helper — create a user and return (user, jwt_token)."""
    user = User(
        email       = email,
        name        = "Test User",
        avatar_url  = "",
        provider    = "google",
        provider_id = f"google_{email}",
        is_active   = True,
        is_admin    = is_admin,
        tokens_balance   = tokens,
        tokens_purchased = purchased,
        tokens_consumed  = 0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return user, token


@pytest.fixture()
def auth_headers(db):
    _, token = make_user(db)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def paid_auth_headers(db):
    _, token = make_user(db, email="paid@docuflow.app", tokens=50_000, purchased=50_000)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_headers(db):
    _, token = make_user(db, email="admin@docuflow.app", tokens=99_999, purchased=99_999, is_admin=True)
    return {"Authorization": f"Bearer {token}"}