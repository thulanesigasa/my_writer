"""
review.py — Human-in-the-Loop Review Routes
=============================================
POST /api/review/{session_id}

Accepts human feedback (approve / revise / reject) and resumes the
LangGraph graph from the HITL interrupt point.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.core.memory import MemoryManager
from backend.core.state import HumanFeedback, PipelineControl
from backend.graph.graph import graph

router = APIRouter()
logger = logging.getLogger(__name__)


class ReviewPayload(BaseModel):
    decision: str               # "approve" | "revise" | "reject"
    revision_notes: str = ""
    reviewer_id: str = "human"


@router.post("/{session_id}")
async def submit_review(session_id: str, payload: ReviewPayload) -> Any:
    """
    Injects human feedback into state and resumes the graph from the
    interrupt point.  Returns immediately; the frontend should reconnect
    to the SSE stream endpoint to continue receiving tokens.
    """
    if payload.decision not in ("approve", "revise", "reject"):
        raise HTTPException(
            status_code=400,
            detail="decision must be one of: approve, revise, reject",
        )

    async with MemoryManager() as mem:
        state = await mem.load_state(session_id)

    if state is None:
        raise HTTPException(status_code=404, detail="Session not found")

    feedback = HumanFeedback(
        decision=payload.decision,
        revision_notes=payload.revision_notes,
        reviewer_id=payload.reviewer_id,
    )

    # Inject feedback into pipeline control
    ctrl: PipelineControl = state["pipeline_control"]
    updated_ctrl = ctrl.model_copy(
        update={
            "human_feedback": feedback,
            "human_approval_required": False,
        }
    )
    state["pipeline_control"] = updated_ctrl

    # Persist updated state so the next SSE stream picks it up
    async with MemoryManager() as mem:
        await mem.save_state(session_id, state)

    logger.info(
        "Review submitted for session %s: decision=%s",
        session_id,
        payload.decision,
    )

    return {
        "session_id": session_id,
        "decision": payload.decision,
        "message": "Feedback recorded. Reconnect to /api/stream/{session_id} to continue.",
    }
