from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool   # ← Import NullPool

from app.config import settings

# ─── Engine setup ─────────────────────────────────────────────────────────────
_is_sqlite = settings.database_url.startswith("sqlite")
_is_supabase_pooler = "pooler.supabase.com" in settings.database_url  # detect Supabase

if _is_sqlite:
    # SQLite: no connection pool settings (uses StaticPool)
    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True,
    )
else:
    # PostgreSQL
    if _is_supabase_pooler:
        # Use NullPool for Supabase transaction pooler (pooling is handled by Supavisor)
        engine = create_engine(
            settings.database_url,
            poolclass=NullPool,
            pool_pre_ping=True,
        )
    else:
        # Normal connection pool for other PostgreSQL (e.g., local development)
        engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )

# Enable WAL mode for SQLite — much better concurrent read performance
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
    """FastAPI dependency: yields a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()