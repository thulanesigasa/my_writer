"""
main.py — FastAPI Application Entry Point & SSE Streaming Endpoint
=====================================================================
Mounts all API routers, configures CORS for the Next.js frontend, and
exposes the real-time SSE streaming endpoint `/api/write` for token-by-token
book drafting via LangGraph.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any, AsyncGenerator

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.core.config import settings
from backend.core.memory import MemoryManager
from backend.core.state import initial_state
from backend.graph.graph import graph
from backend.utils.prompt_builder import build_review_payload
from backend.utils.utils import load_full_context_string
from backend.api.routes import books, stream, review, health

# ─── Logging setup ────────────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Book Writer API",
    description="LangGraph-powered, human-in-the-loop SSE streaming book generation system",
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(books.router, prefix="/api/books", tags=["Books"])
app.include_router(stream.router, prefix="/api/stream", tags=["Stream"])
app.include_router(review.router, prefix="/api/review", tags=["Review"])


# ─── Request Model for /api/write ─────────────────────────────────────────────
class StartWritingRequest(BaseModel):
    title: str = Field("The Power of Instinct", description="Book title")
    genre: str = Field("Popular Neuroscience & Leadership", description="Genre")
    premise: str = Field(
        "Instinct is not the enemy of good thinking — it is the compressed intelligence of lived experience.",
        description="Core premise",
    )
    target_audience: str = Field("Leaders, Executives, and Personal Growth Seekers", description="Target audience")
    total_chapters: int = Field(5, description="Number of chapters in outline")
    session_id: str | None = Field(None, description="Optional existing session ID")


# ─── SSE Generator Function ───────────────────────────────────────────────────
async def stream_book_generation(payload: StartWritingRequest) -> AsyncGenerator[str, None]:
    """
    Async generator that executes the LangGraph state machine and yields
    Server-Sent Events (SSE) token-by-token to the client.

    Yields SSE messages in format:
        data: {"type": "...", "content": "..."}\n\n
    """
    session_id = payload.session_id or str(uuid.uuid4())
    logger.info("Starting SSE generation for session %s (Title: %s)", session_id, payload.title)

    # 1. Load full 8-file Context Anchor string from disk
    full_context = load_full_context_string()

    # 2. Build initial state
    state = initial_state(
        book_title=payload.title,
        genre=payload.genre,
        premise=payload.premise,
        total_chapters=payload.total_chapters,
        session_id=session_id,
        story_bible_raw=full_context,
    )
    state["context_anchor"].target_audience = payload.target_audience

    # Send initial status event
    yield f"data: {json.dumps({'type': 'status', 'status': 'initializing', 'session_id': session_id, 'message': 'Initializing state and loading Context Anchor...'})}\n\n"
    await asyncio.sleep(0.1)

    config = {
        "configurable": {"thread_id": session_id},
        "recursion_limit": 250,
    }

    try:
        active_sub_section = ""
        current_node = ""

        async for event in graph.astream_events(state, config=config, version="v2"):
            kind = event.get("event")
            name = event.get("name", "")
            data = event.get("data", {})

            # Node transition detection
            if kind == "on_chain_start" and name in ("plan_step", "execute_step", "replan_step", "human_review"):
                current_node = name
                msg = ""
                if name == "plan_step":
                    msg = "Planner AI is parsing book_outline.md and building sub-section tasks..."
                elif name == "execute_step":
                    msg = f"Drafting sub-section: {active_sub_section or 'prose'}..."
                elif name == "replan_step":
                    msg = "Summarising completed sub-section and compressing memory..."
                elif name == "human_review":
                    msg = "Human Review Checkpoint — waiting for review feedback."

                yield f"data: {json.dumps({'type': 'status', 'status': name, 'message': msg, 'current_node': name})}\n\n"

            # Capture node execution output state changes (e.g. plan generated)
            elif kind == "on_chain_end" and name == "plan_step":
                output = data.get("output", {})
                plan = output.get("plan", [])
                if plan:
                    first_task = plan[0]
                    active_sub_section = first_task.get("title", "")
                    yield f"data: {json.dumps({'type': 'plan', 'plan': plan, 'current_task': active_sub_section})}\n\n"

            elif kind == "on_chain_end" and name == "replan_step":
                output = data.get("output", {})
                plan = output.get("plan", [])
                past_steps = output.get("past_steps", [])
                latest_summary = past_steps[-1] if past_steps else ""
                next_task = plan[0].get("title", "") if plan else "Complete"
                active_sub_section = next_task
                yield f"data: {json.dumps({'type': 'replan', 'latest_summary': latest_summary, 'remaining_plan_count': len(plan), 'next_task': next_task})}\n\n"

            # Token streaming from drafting_llm or orchestration_llm
            elif kind == "on_chat_model_stream":
                chunk = data.get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    content_str = str(chunk.content)
                    yield f"data: {json.dumps({'type': 'token', 'content': content_str, 'node': current_node, 'sub_section': active_sub_section})}\n\n"

            # HITL interrupt check
            elif kind == "on_chain_end" and name == "LangGraph":
                output = data.get("output", {})
                ctrl = output.get("pipeline_control")
                requires_hitl = (
                    ctrl.human_approval_required
                    if hasattr(ctrl, "human_approval_required")
                    else (ctrl or {}).get("human_approval_required", False)
                )
                if requires_hitl:
                    payload_data = build_review_payload(output)
                    yield f"data: {json.dumps({'type': 'hitl_pause', 'payload': payload_data})}\n\n"
                    return

        # Complete event
        yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'message': 'Book drafting process completed successfully!'})}\n\n"

    except Exception as exc:
        logger.exception("Error during SSE stream execution for session %s", session_id)
        yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"


# ─── Primary /api/write SSE Endpoint ──────────────────────────────────────────
@app.post("/api/write")
async def start_writing_post(payload: StartWritingRequest) -> StreamingResponse:
    """
    POST /api/write — Streaming SSE endpoint. Initiates the LangGraph state machine
    and streams token-by-token prose generation and status updates to the client.
    """
    return StreamingResponse(
        stream_book_generation(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/write")
async def start_writing_get(
    title: str = "The Power of Instinct",
    genre: str = "Popular Neuroscience & Leadership",
    premise: str = "Instinct is not the enemy of good thinking — it is compressed intelligence.",
) -> StreamingResponse:
    """
    GET /api/write — Convenience GET SSE endpoint for native EventSource or direct browser streams.
    """
    payload = StartWritingRequest(title=title, genre=genre, premise=premise)
    return StreamingResponse(
        stream_book_generation(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("AI Book Writer API initialized and ready at http://%s:%d", settings.api_host, settings.api_port)


@app.on_event("shutdown")
async def on_shutdown() -> None:
    logger.info("AI Book Writer API shutting down...")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
    )
