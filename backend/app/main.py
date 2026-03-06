"""
DocuFlow API — Application entry point
Run with: uvicorn app.main:app --reload --port 8000
"""
import sys
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.config import settings
from app.database import Base, engine, SessionLocal
from app.api import admin, ai, auth, convert, payment


def _check_db_connection():
    """Try a real DB connection at startup — fail loudly if it doesn't work."""
    from sqlalchemy import text
    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
        logger.info("✓ Database connection OK")
    except Exception as e:
        logger.error(f"FATAL: Cannot connect to database: {e}")
        logger.error(
            "Check DATABASE_URL in Render → Environment. "
            "It should be the Supabase Transaction Pooler URL "
            "(port 6543, not 5432)."
        )
        sys.exit(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"DocuFlow API starting — env={settings.app_env}")
    logger.info(f"Frontend URL: {settings.frontend_url}")
    logger.info(f"DB backend: {'postgresql' if 'postgresql' in settings.database_url else 'sqlite'}")

    # Validate DB connection before accepting traffic
    _check_db_connection()

    # Create tables (idempotent)
    Base.metadata.create_all(bind=engine)
    logger.info("✓ Database tables OK")

    yield
    logger.info("DocuFlow API shutting down")


app = FastAPI(
    title       = "DocuFlow API",
    description = "File conversion & AI document generation",
    version     = "2.0.0",
    lifespan    = lifespan,
    docs_url    = "/docs" if settings.app_env != "production" else None,
    redoc_url   = None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_ORIGINS = list(dict.fromkeys([
    settings.frontend_url,
    "https://bluskystore.shop",
    "https://www.bluskystore.shop",
    "https://docxflow.site",
    "https://www.docxflow.site",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]))

app.add_middleware(
    CORSMiddleware,
    allow_origins     = _ORIGINS,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Timing middleware ──────────────────────────────────────────────────────────
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    t0 = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Process-Time"] = f"{time.perf_counter() - t0:.3f}s"
    return response


# ── Global error handler ───────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code = 500,
        content     = {"detail": "An internal server error occurred. Please try again."},
    )


# ── Routers ────────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"
app.include_router(auth.router,    prefix=PREFIX)
app.include_router(convert.router, prefix=PREFIX)
app.include_router(ai.router,      prefix=PREFIX)
app.include_router(payment.router, prefix=PREFIX)
app.include_router(admin.router,   prefix=PREFIX)


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"name": "DocuFlow API", "version": "2.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy", "env": settings.app_env}