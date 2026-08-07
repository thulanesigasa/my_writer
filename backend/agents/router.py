"""
router.py — Catch-All Router Node
==================================
A lightweight passthrough node that updates the current_node label
and lets conditional edges handle all routing logic.
"""

from __future__ import annotations

from datetime import datetime

from backend.core.state import BookWriterState, NodeName


async def router_node(state: BookWriterState) -> dict:
    """Simply marks the current node and returns; routing done by edges."""
    ctrl = state["pipeline_control"]
    return {
        "pipeline_control": ctrl.model_copy(update={"current_node": NodeName.ROUTER}),
        "updated_at": datetime.utcnow().isoformat(),
    }
