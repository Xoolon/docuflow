"""
Database engine — deferred creation with startup validation.
Fails loudly on misconfiguration so Render logs show the real error.
"""
import sys
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings


def _validate_database_url(url: str) -> None:
    """Crash with a useful message if the DB URL is obviously wrong."""
    if not url:
        print("FATAL: DATABASE_URL is not set. Add it in Render → Environment.", file=sys.stderr)
        sys.exit(1)
    if url == "sqlite:///./docuflow.db" and settings.app_env == "production":
        print(
            "FATAL: DATABASE_URL is still the SQLite default but APP_ENV=production. "
            "Set DATABASE_URL to your Supabase PostgreSQL connection string in Render → Environment.",
            file=sys.stderr,
        )
        sys.exit(1)


_validate_database_url(settings.database_url)

# ─── Engine ───────────────────────────────────────────────────────────────────
_is_sqlite = settings.database_url.startswith("sqlite")

if _is_sqlite:
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    # PostgreSQL — Supabase transaction pooler uses pgbouncer, needs
    # pool_pre_ping and reasonable pool size.  No statement_timeout here
    # because pgbouncer handles that server-side.
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_size=5,        # starter plan has limited connections
        max_overflow=10,
        connect_args={
            # Required for Supabase pgbouncer (transaction pooler)
            "sslmode": "require",
            "connect_timeout": 10,
        },
    )

if _is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# ─── Session ──────────────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()