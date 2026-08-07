"""
graph.py — Master LangGraph Plan-and-Execute Graph Definition
==============================================================
Assembles and compiles the directed Plan-and-Execute graph with:
  • Nodes: plan_step ──▶ execute_step ──▶ replan_step ──▶ (loop or END)
  • Human-in-the-loop interrupt: interrupt_before=["execute_step"]
  • Redis & MemorySaver checkpointer persistence for thread session state
"""

from __future__ import annotations

import logging
from typing import Any

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.graph.graph import CompiledGraph

from backend.core.memory import make_checkpoint_saver
from backend.core.state import BookWriterState, NodeName
from backend.graph.nodes import (
    execute_step,
    plan_step,
    replan_step,
    should_continue,
)

logger = logging.getLogger(__name__)


def build_plan_execute_graph() -> CompiledGraph:
    """
    Construct and compile the Plan-and-Execute StateGraph.

    Configured with interrupt_before=["execute_step"] so that execution
    pauses after plan_step or replan_step, allowing the user to inspect,
    edit, and approve the plan/summaries before drafting prose.
    """
    g = StateGraph(BookWriterState)

    # ── Register core Plan-and-Execute nodes ──────────────────────────────────
    g.add_node("plan_step", plan_step)
    g.add_node("execute_step", execute_step)
    g.add_node("replan_step", replan_step)

    # ── Edges ─────────────────────────────────────────────────────────────────
    g.add_edge(START, "plan_step")
    g.add_edge("plan_step", "execute_step")
    g.add_edge("execute_step", "replan_step")
    g.add_conditional_edges(
        "replan_step",
        should_continue,
        {"execute": "execute_step", "end": END},
    )

    # ── Checkpointer setup (Redis with MemorySaver fallback) ─────────────────
    try:
        checkpointer = make_checkpoint_saver()
        logger.info("Using Redis checkpointer (AsyncRedisSaver)")
    except Exception as exc:
        logger.warning("Redis checkpointer unavailable (%s); falling back to MemorySaver", exc)
        checkpointer = MemorySaver()

    compiled = g.compile(
        checkpointer=checkpointer,
        interrupt_before=["execute_step"],
    )
    logger.info("Plan-and-Execute graph compiled with interrupt_before=['execute_step']")
    return compiled


# Module-level singleton instance
graph: CompiledGraph = build_plan_execute_graph()
