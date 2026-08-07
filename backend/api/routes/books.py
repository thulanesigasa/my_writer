"""
books.py — Book Session Management Routes
==========================================
POST /api/books        — Create a new book session, run planner
GET  /api/books        — List all sessions
GET  /api/books/{id}   — Get session state
DELETE /api/books/{id} — Delete session
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.core.state import initial_state
from backend.core.memory import MemoryManager
from backend.graph.graph import graph
from backend.utils.utils import load_full_context_string

router = APIRouter()


class CreateBookRequest(BaseModel):
    title: str = ""
    genre: str
    premise: str
    target_audience: str = "general adult readers"
    total_chapters: int = 10


class BookSessionResponse(BaseModel):
    session_id: str
    run_id: str
    title: str
    genre: str
    status: str
    created_at: str


@router.post("", response_model=BookSessionResponse, status_code=201)
async def create_book(payload: CreateBookRequest) -> Any:
    """
    Initialises a new book session and runs the Planner node to generate
    the chapter outline.  Returns the session ID for subsequent SSE streaming.
    """
    session_id = str(uuid.uuid4())

    # ── Load all 8 Context Anchor markdown files concatenated from disk ──────
    full_context = load_full_context_string()

    state = initial_state(
        book_title=payload.title,
        genre=payload.genre,
        premise=payload.premise,
        total_chapters=payload.total_chapters,
        session_id=session_id,
        story_bible_raw=full_context,       # ← injected into ContextAnchor
    )
    state["context_anchor"].target_audience = payload.target_audience

    config = {"configurable": {"thread_id": session_id}}

    # Run the graph up to the first interrupt (after planning)
    result = await graph.ainvoke(state, config=config)

    async with MemoryManager() as mem:
        await mem.save_state(session_id, result)

    return BookSessionResponse(
        session_id=session_id,
        run_id=result["run_id"],
        title=result["context_anchor"].title,
        genre=payload.genre,
        status="planned",
        created_at=result["created_at"],
    )


@router.get("/{session_id}")
async def get_book_session(session_id: str) -> Any:
    """Return the current persisted state for a session."""
    async with MemoryManager() as mem:
        state = await mem.load_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    anchor = state["context_anchor"]
    ctrl = state["pipeline_control"]
    return {
        "session_id": session_id,
        "title": anchor.title,
        "genre": anchor.genre,
        "total_chapters": anchor.total_chapters,
        "current_chapter": state["working_memory"].current_chapter,
        "current_node": ctrl.current_node,
        "human_approval_required": ctrl.human_approval_required,
        "chapters_complete": [
            cs.chapter_number for cs in state["chapter_summaries"]
            if cs.status.value in ("approved", "pruned")
        ],
        "book_complete": ctrl.book_complete,
        "updated_at": state["updated_at"],
    }
