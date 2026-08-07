"""
main.py — FastAPI Application Entry Point
==========================================
Mounts all API routers, configures CORS for the Next.js frontend,
and bootstraps startup/shutdown lifecycle events.
"""

from __future__ import annotations

import logging

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.api.routes import books, stream, review, health

# ─── Logging setup ────────────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)
logging.basicConfig(level=logging.INFO)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Book Writer API",
    description="LangGraph-powered, human-in-the-loop book generation system",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router,  prefix="/api",         tags=["Health"])
app.include_router(books.router,   prefix="/api/books",   tags=["Books"])
app.include_router(stream.router,  prefix="/api/stream",  tags=["Stream"])
app.include_router(review.router,  prefix="/api/review",  tags=["Review"])


@app.on_event("startup")
async def on_startup() -> None:
    logging.getLogger(__name__).info("AI Book Writer API starting up…")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logging.getLogger(__name__).info("AI Book Writer API shutting down…")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )
