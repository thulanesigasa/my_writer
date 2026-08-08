"""
main.py — FastAPI Application Entry Point & SSE Streaming Endpoint
=====================================================================
Mounts all API routers, configures CORS for the Next.js frontend, and
exposes the real-time SSE streaming endpoints `/api/write` and `/api/resume`
for token-by-token book drafting with Human-in-the-Loop (HITL) review gates.
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
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel, Field
import os

from backend.core.config import settings
from backend.core.memory import MemoryManager
from backend.core.state import initial_state
from backend.graph.graph import graph
from backend.utils.prompt_builder import build_review_payload
from backend.utils.utils import load_story_bible
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
    version="0.3.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(books.router, prefix="/api/books", tags=["Books"])
app.include_router(stream.router, prefix="/api/stream", tags=["Stream"])
app.include_router(review.router, prefix="/api/review", tags=["Review"])


# ─── Request Models ───────────────────────────────────────────────────────────
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


class ResumeWritingRequest(BaseModel):
    thread_id: str = Field(..., description="Session/Thread ID to resume")
    plan: list[dict] | None = Field(None, description="Updated sub-section plan tasks")
    past_steps: list[str] | None = Field(None, description="Updated compressed summaries")
    user_edits: dict[str, Any] | None = Field(None, description="Additional state overrides")


# ─── SSE Streaming Helper ─────────────────────────────────────────────────────
async def run_graph_and_stream(
    initial_input: dict | None,
    config: dict,
    session_id: str,
) -> AsyncGenerator[str, None]:
    """
    Executes or resumes graph execution using astream_events and yields SSE events.
    Pauses on interrupt_before=['execute_step'] and yields hitl_pause event.
    """
    try:
        active_sub_section = ""
        current_node = ""

        async for event in graph.astream_events(initial_input, config=config, version="v2"):
            kind = event.get("event")
            name = event.get("name", "")
            data = event.get("data", {})

            # Node start transition
            if kind == "on_chain_start" and name in ("plan_step", "research_step", "execute_step", "replan_step", "front_matter_step", "back_matter_step", "compile_book_step"):
                current_node = name
                msg = ""
                if name == "plan_step":
                    msg = "Planner AI is generating granular sub-section tasks..."
                elif name == "research_step":
                    msg = f"Researching facts for: {active_sub_section}..."
                elif name == "execute_step":
                    msg = f"Drafting sub-section prose: {active_sub_section}..."
                elif name == "replan_step":
                    msg = "Summarising completed sub-section and compressing memory..."
                elif name == "front_matter_step":
                    msg = "Synthesizing Front Matter (Title Page, TOC, Introduction)..."
                elif name == "back_matter_step":
                    msg = "Synthesizing Back Matter (Conclusion, Acknowledgments, Glossary)..."
                elif name == "compile_book_step":
                    msg = "Compiling final book to Markdown format..."

                yield f"data: {json.dumps({'type': 'status', 'status': name, 'message': msg, 'current_node': name, 'session_id': session_id})}\n\n"

            # Plan generated
            elif kind == "on_chain_end" and name == "plan_step":
                output = data.get("output", {})
                plan = output.get("plan", [])
                if plan:
                    active_sub_section = plan[0].get("title", "")
                    yield f"data: {json.dumps({'type': 'plan', 'plan': plan, 'current_task': active_sub_section, 'session_id': session_id})}\n\n"

            # Replan / summary complete
            elif kind == "on_chain_end" and name == "replan_step":
                output = data.get("output", {})
                plan = output.get("plan", [])
                past_steps = output.get("past_steps", [])
                latest_summary = past_steps[-1] if past_steps else ""
                next_task = plan[0].get("title", "") if plan else "Complete"
                active_sub_section = next_task
                yield f"data: {json.dumps({'type': 'replan', 'latest_summary': latest_summary, 'remaining_plan_count': len(plan), 'next_task': next_task, 'session_id': session_id})}\n\n"

            # LLM Token Stream (only stream creative prose, not JSON planning tokens)
            elif kind == "on_chat_model_stream":
                if current_node in ("execute_step", "front_matter_step", "back_matter_step"):
                    chunk = data.get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        content_str = str(chunk.content)
                        yield f"data: {json.dumps({'type': 'token', 'content': content_str, 'node': current_node, 'sub_section': active_sub_section, 'session_id': session_id})}\n\n"

        # Check graph state to see if interrupted before research_step / execute_step
        graph_state = graph.get_state(config)
        if graph_state and graph_state.next:
            next_nodes = list(graph_state.next)
            if any(n in next_nodes for n in ("research_step", "execute_step")):
                current_values = graph_state.values or {}
                current_plan = current_values.get("plan", [])
                past_steps = current_values.get("past_steps", [])
                target_task = current_plan[0].get("title", "") if current_plan else ""

                logger.info("HITL Interrupt reached before %s for thread %s", next_nodes, session_id)
                yield f"data: {json.dumps({'type': 'hitl_pause', 'status': 'waiting_for_approval', 'thread_id': session_id, 'session_id': session_id, 'target_task': target_task, 'plan': current_plan, 'past_steps': past_steps, 'message': 'Review Mode: AI is waiting for your approval or edits before drafting prose.'})}\n\n"
                return

        # Complete
        yield f"data: {json.dumps({'type': 'done', 'session_id': session_id, 'message': 'Book drafting complete!'})}\n\n"

    except Exception as exc:
        import traceback as _tb
        full_tb = _tb.format_exc()
        logger.error("STREAM ERROR for session %s:\n%s", session_id, full_tb)
        yield f"data: {json.dumps({'type': 'error', 'message': f'{type(exc).__name__}: {exc}', 'session_id': session_id})}\n\n"


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/api/write")
async def start_writing(payload: StartWritingRequest) -> StreamingResponse:
    """
    POST /api/write — Initiates a new book drafting session and streams
    events up to the first interrupt checkpoint.
    """
    session_id = payload.session_id or str(uuid.uuid4())
    story_bible_text = load_story_bible()

    state = initial_state(
        book_title=payload.title,
        genre=payload.genre,
        premise=payload.premise,
        total_chapters=payload.total_chapters,
        session_id=session_id,
        story_bible_raw=story_bible_text,
    )
    state["context_anchor"].target_audience = payload.target_audience

    config = {
        "configurable": {"thread_id": session_id},
        "recursion_limit": 250,
    }

    return StreamingResponse(
        run_graph_and_stream(state, config, session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/resume")
async def resume_writing(payload: ResumeWritingRequest) -> StreamingResponse:
    """
    POST /api/resume — Applies user edits (plan/summaries), updates LangGraph checkpoint
    state, and resumes streaming execution through to the next interrupt point.
    """
    session_id = payload.thread_id
    config = {
        "configurable": {"thread_id": session_id},
        "recursion_limit": 250,
    }

    # Build state updates from payload
    state_updates: dict[str, Any] = {}
    if payload.plan is not None:
        graph_state = graph.get_state(config)
        current_values = graph_state.values if graph_state else {}
        past_count = len(current_values.get("past_steps", []))
        if past_count > 0 and len(payload.plan) >= past_count:
            logger.info("Slicing %d already completed tasks from payload plan", past_count)
            state_updates["plan"] = payload.plan[past_count:]
        else:
            state_updates["plan"] = payload.plan

    if payload.past_steps is not None:
        state_updates["past_steps"] = payload.past_steps
    if payload.user_edits:
        state_updates.update(payload.user_edits)

    if state_updates:
        logger.info("Applying state updates to thread %s: %s", session_id, list(state_updates.keys()))
        graph.update_state(config, state_updates)

    return StreamingResponse(
        run_graph_and_stream(None, config, session_id),
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
    """GET /api/write — Convenience GET endpoint for SSE streams."""
    payload = StartWritingRequest(title=title, genre=genre, premise=premise)
    return await start_writing(payload)




class DownloadRequest(BaseModel):
    prose: str = Field(..., description="The markdown manuscript prose to convert to PDF")
    title: str = Field("The Power of Instinct", description="Book title")


def _build_pdf_bytes(prose: str, title: str) -> bytes:
    """Convert markdown prose string to PDF bytes using reportlab."""
    from io import BytesIO
    from reportlab.lib.pagesizes import letter
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
    from reportlab.lib import colors

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=letter,
        rightMargin=54, leftMargin=54, topMargin=54, bottomMargin=54
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'BookTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=24, leading=30,
        textColor=colors.HexColor("#1A1A1A"), alignment=TA_CENTER, spaceAfter=12
    )
    author_style = ParagraphStyle(
        'AuthorMeta', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=11, leading=15,
        textColor=colors.HexColor("#EA580C"), alignment=TA_CENTER, spaceAfter=25
    )
    h1_style = ParagraphStyle(
        'ChapterHeader', parent=styles['Heading1'],
        fontName='Helvetica-Bold', fontSize=18, leading=22,
        textColor=colors.HexColor("#0F172A"), spaceBefore=18, spaceAfter=10
    )
    h2_style = ParagraphStyle(
        'SectionHeader', parent=styles['Heading2'],
        fontName='Helvetica-Bold', fontSize=13, leading=17,
        textColor=colors.HexColor("#1E293B"), spaceBefore=12, spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyProse', parent=styles['BodyText'],
        fontName='Helvetica', fontSize=10, leading=15,
        textColor=colors.HexColor("#334155"), alignment=TA_JUSTIFY, spaceAfter=8
    )

    story = []
    story.append(Paragraph(title.upper(), title_style))
    story.append(Paragraph(
        "Thulane J. Sigasa, Author 2026 | +27 60 642 9587 | pharezsigasa@gmail.com",
        author_style
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=18))

    for line in prose.split("\n"):
        l = line.strip()
        if not l:
            story.append(Spacer(1, 4))
            continue
        # No em-dashes
        l = l.replace("\u2014", " - ").replace("--", " - ")
        if l.startswith("# "):
            story.append(Paragraph(l[2:].strip(), title_style))
        elif l.startswith("## "):
            story.append(Paragraph(l[3:].strip(), h1_style))
        elif l.startswith("### "):
            story.append(Paragraph(l[4:].strip(), h2_style))
        else:
            import re as _re
            # Escape XML special chars BEFORE inserting tags
            safe = l.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            # Replace **text** with <b>text</b>
            safe = _re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe)
            story.append(Paragraph(safe, body_style))

    doc.build(story)
    return buf.getvalue()


@app.post("/api/download")
async def download_manuscript(payload: DownloadRequest):
    """POST /api/download — Accepts manuscript markdown, returns a formatted PDF."""
    import io
    from fastapi.responses import Response

    logger.info("download_manuscript | Generating PDF for title=%r (%d chars)", payload.title, len(payload.prose))
    try:
        pdf_bytes = _build_pdf_bytes(payload.prose, payload.title)
        safe_title = "".join([c if c.isalnum() else "_" for c in payload.title]).strip("_")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{safe_title}_Final.pdf"'},
        )
    except Exception as exc:
        logger.exception("PDF generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {exc}")



@app.on_event("startup")
async def on_startup() -> None:
    logger.info("AI Book Writer API running at http://%s:%d", settings.api_host, settings.api_port)


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
