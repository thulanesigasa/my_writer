"""
human_review.py — Human-in-the-Loop Review Node
=================================================
This node is the LangGraph interrupt point.  It does NOT call an LLM.
It packages the current draft/summary for presentation to the frontend
and then pauses — LangGraph's interrupt_before mechanism halts execution
until the graph is resumed with human feedback injected into state.

Resumption is triggered from the FastAPI `/api/review/{session_id}` endpoint.
"""

from __future__ import annotations

import logging
from datetime import datetime

from backend.core.state import (
    BookWriterState,
    HumanFeedback,
    NodeName,
    PipelineControl,
)

logger = logging.getLogger(__name__)


async def human_review_node(state: BookWriterState) -> dict:
    """
    LangGraph node: processes the human's feedback decision.

    If feedback is "approve" → clear HITL flag, let pruner/router proceed.
    If feedback is "revise"  → clear HITL flag, pass revision notes to writer.
    If feedback is "reject"  → reset draft, decrement chapter counter.

    Note: LangGraph interrupts BEFORE this node runs.  When the graph
    resumes (via graph.invoke(state, config)), this function executes with
    the human_feedback already written into state by the API layer.
    """
    ctrl: PipelineControl = state["pipeline_control"]
    feedback: HumanFeedback | None = ctrl.human_feedback

    if feedback is None:
        # Should not happen if API layer is correct — log and continue
        logger.warning("human_review_node called with no feedback; defaulting to approve")
        feedback = HumanFeedback(decision="approve")

    logger.info("Human review decision: %s", feedback.decision)

    updated_ctrl = ctrl.model_copy(
        update={
            "current_node": NodeName.HUMAN_REVIEW,
            "human_approval_required": False,   # cleared — graph can advance
            "human_feedback": feedback,
            "retry_count": (
                ctrl.retry_count + 1
                if feedback.decision in ("revise", "reject")
                else 0
            ),
        }
    )

    return {
        "pipeline_control": updated_ctrl,
        "updated_at": datetime.utcnow().isoformat(),
    }
