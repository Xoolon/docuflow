"""
DocuFlow API — Application entry point
Run with: uvicorn app.main:app --reload --port 8000
"""
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

from app.config import settings
from app.database import Base, engine
from app.api import admin, ai, auth, convert, payment


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("DocuFlow API starting up...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables OK")
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
# Allowed origins — add all domains (temp + permanent) here
_ORIGINS = [
    # Production domains
    settings.frontend_url,
    "https://bluskystore.shop",
    "https://www.bluskystore.shop",
    "https://docxflow.site",
    "https://www.docxflow.site",
    # Local dev
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins     = list(dict.fromkeys(_ORIGINS)),  # deduplicate
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)


# ── Timing middleware ──────────────────────────────────────────────────────────
@app.middleware("http")
async def add_timing_header(request: Request, call_next):
    t0       = time.perf_counter()
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