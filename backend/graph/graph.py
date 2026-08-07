"""
graph.py — Master LangGraph StateGraph Definition
==================================================
Assembles the full book-writing directed graph with:
  • Section sub-graphs (front matter → chapters → back matter)
  • Conditional routing based on PipelineControl flags
  • Human-in-the-loop interrupt_before the HUMAN_REVIEW node
  • Redis-backed checkpoint persistence
"""

from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, START, StateGraph
from langgraph.graph.graph import CompiledGraph

from backend.core.memory import make_checkpoint_saver
from backend.core.state import BookWriterState, NodeName, PipelineControl
from backend.agents.planner import planner_node
from backend.agents.front_matter import front_matter_node
from backend.agents.chapter_writer import chapter_writer_node
from backend.agents.back_matter import back_matter_node
from backend.agents.context_summariser import context_summariser_node
from backend.agents.context_pruner import context_pruner_node
from backend.agents.human_review import human_review_node
from backend.agents.router import router_node

logger = logging.getLogger(__name__)


# ─── Conditional edge functions ───────────────────────────────────────────────

def route_after_planner(state: BookWriterState) -> str:
    """After planning, always start with front matter."""
    return NodeName.FRONT_MATTER_WRITER


def route_after_router(state: BookWriterState) -> str:
    """
    Central routing function.  Reads `pipeline_control.next_node` to
    determine which node the graph should proceed to.
    """
    ctrl: PipelineControl = state["pipeline_control"]
    if ctrl.human_approval_required:
        return NodeName.HUMAN_REVIEW
    if ctrl.next_node:
        return ctrl.next_node
    if not ctrl.front_matter_complete:
        return NodeName.FRONT_MATTER_WRITER
    if not ctrl.all_chapters_complete:
        return NodeName.CHAPTER_WRITER
    if not ctrl.back_matter_complete:
        return NodeName.BACK_MATTER_WRITER
    return END


def route_after_chapter_writer(state: BookWriterState) -> str:
    """After a chapter segment, decide: summarise or keep drafting."""
    ctrl: PipelineControl = state["pipeline_control"]
    if ctrl.human_approval_required:
        return NodeName.HUMAN_REVIEW
    wm = state["working_memory"]
    target = 2000  # words; import from settings if needed
    if wm.current_word_count >= target:
        return NodeName.CONTEXT_SUMMARISER
    return NodeName.CHAPTER_WRITER  # continue drafting same chapter


def route_after_summariser(state: BookWriterState) -> str:
    """After summarisation, always require human review before pruning."""
    return NodeName.HUMAN_REVIEW


def route_after_human_review(state: BookWriterState) -> str:
    """Act on human decision: approve → prune, revise → re-draft."""
    ctrl: PipelineControl = state["pipeline_control"]
    if ctrl.human_feedback and ctrl.human_feedback.decision == "approve":
        return NodeName.CONTEXT_PRUNER
    # revision or rejection → send back to the appropriate writer
    if not ctrl.front_matter_complete:
        return NodeName.FRONT_MATTER_WRITER
    if not ctrl.all_chapters_complete:
        return NodeName.CHAPTER_WRITER
    return NodeName.BACK_MATTER_WRITER


def route_after_pruner(state: BookWriterState) -> str:
    """After pruning, check what's left to write."""
    ctrl: PipelineControl = state["pipeline_control"]
    if ctrl.all_chapters_complete and not ctrl.back_matter_complete:
        return NodeName.BACK_MATTER_WRITER
    if ctrl.book_complete:
        return END
    return NodeName.CHAPTER_WRITER  # next chapter


# ─── Graph builder ────────────────────────────────────────────────────────────

def build_graph() -> CompiledGraph:
    """
    Construct and compile the full book-writing StateGraph.

    Interrupt before HUMAN_REVIEW so the UI can surface the draft to the
    human reviewer and collect structured feedback before the graph resumes.
    """
    g = StateGraph(BookWriterState)

    # ── Register nodes ────────────────────────────────────────────────────────
    g.add_node(NodeName.PLANNER, planner_node)
    g.add_node(NodeName.FRONT_MATTER_WRITER, front_matter_node)
    g.add_node(NodeName.CHAPTER_WRITER, chapter_writer_node)
    g.add_node(NodeName.BACK_MATTER_WRITER, back_matter_node)
    g.add_node(NodeName.CONTEXT_SUMMARISER, context_summariser_node)
    g.add_node(NodeName.CONTEXT_PRUNER, context_pruner_node)
    g.add_node(NodeName.HUMAN_REVIEW, human_review_node)
    g.add_node(NodeName.ROUTER, router_node)

    # ── Entry ─────────────────────────────────────────────────────────────────
    g.add_edge(START, NodeName.PLANNER)

    # ── Planner → front matter ────────────────────────────────────────────────
    g.add_conditional_edges(
        NodeName.PLANNER,
        route_after_planner,
        {NodeName.FRONT_MATTER_WRITER: NodeName.FRONT_MATTER_WRITER},
    )

    # ── Front matter → router ─────────────────────────────────────────────────
    g.add_edge(NodeName.FRONT_MATTER_WRITER, NodeName.ROUTER)

    # ── Chapter writer → summariser or loop ───────────────────────────────────
    g.add_conditional_edges(
        NodeName.CHAPTER_WRITER,
        route_after_chapter_writer,
        {
            NodeName.CONTEXT_SUMMARISER: NodeName.CONTEXT_SUMMARISER,
            NodeName.CHAPTER_WRITER: NodeName.CHAPTER_WRITER,
            NodeName.HUMAN_REVIEW: NodeName.HUMAN_REVIEW,
        },
    )

    # ── Summariser → human review ─────────────────────────────────────────────
    g.add_conditional_edges(
        NodeName.CONTEXT_SUMMARISER,
        route_after_summariser,
        {NodeName.HUMAN_REVIEW: NodeName.HUMAN_REVIEW},
    )

    # ── Human review → prune or re-draft ─────────────────────────────────────
    g.add_conditional_edges(
        NodeName.HUMAN_REVIEW,
        route_after_human_review,
        {
            NodeName.CONTEXT_PRUNER: NodeName.CONTEXT_PRUNER,
            NodeName.FRONT_MATTER_WRITER: NodeName.FRONT_MATTER_WRITER,
            NodeName.CHAPTER_WRITER: NodeName.CHAPTER_WRITER,
            NodeName.BACK_MATTER_WRITER: NodeName.BACK_MATTER_WRITER,
        },
    )

    # ── Pruner → next section or END ──────────────────────────────────────────
    g.add_conditional_edges(
        NodeName.CONTEXT_PRUNER,
        route_after_pruner,
        {
            NodeName.CHAPTER_WRITER: NodeName.CHAPTER_WRITER,
            NodeName.BACK_MATTER_WRITER: NodeName.BACK_MATTER_WRITER,
            END: END,
        },
    )

    # ── Router (catch-all re-routing) ─────────────────────────────────────────
    g.add_conditional_edges(
        NodeName.ROUTER,
        route_after_router,
        {
            NodeName.FRONT_MATTER_WRITER: NodeName.FRONT_MATTER_WRITER,
            NodeName.CHAPTER_WRITER: NodeName.CHAPTER_WRITER,
            NodeName.BACK_MATTER_WRITER: NodeName.BACK_MATTER_WRITER,
            NodeName.HUMAN_REVIEW: NodeName.HUMAN_REVIEW,
            END: END,
        },
    )

    # ── Back matter → END ────────────────────────────────────────────────────
    g.add_edge(NodeName.BACK_MATTER_WRITER, END)

    # ── Compile with Redis checkpointer & HITL interrupt ─────────────────────
    checkpointer = make_checkpoint_saver()
    compiled = g.compile(
        checkpointer=checkpointer,
        interrupt_before=[NodeName.HUMAN_REVIEW],
    )
    logger.info("Book-writing graph compiled successfully")
    return compiled


# Module-level singleton — import and use in API routes
graph: CompiledGraph = build_graph()
