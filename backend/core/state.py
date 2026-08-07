"""
state.py — LangGraph Explicit State Schema
==========================================
This module defines the canonical TypedDict state that flows through every node
in the book-writing graph.  All sub-graphs (front matter, narrative body, back
matter) share this single schema so that state checkpoints stored in Redis are
fully deserializable at any resumption point.

Design Principles
─────────────────
• Immutability-by-convention: nodes MUST return a *partial* dict that LangGraph
  merges into the current state — never mutate state in place.
• Context Anchor is the single source of truth for story facts; it is injected
  into every agent prompt and never pruned from working memory.
• Raw prose is pruned after summarisation to keep the active context window lean.
• Human-in-the-loop checkpoints are signalled via the `human_approval_required`
  flag; LangGraph's interrupt_before mechanism will pause on that node.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Annotated, Any

try:
    from langgraph.graph.message import add_messages  # type: ignore
except ImportError:
    try:
        from langgraph.graph import add_messages  # type: ignore
    except ImportError:
        def add_messages(left: list, right: list) -> list:
            """Fallback reducer if langgraph is not installed in interpreter environment."""
            return (left or []) + (right or [])


from pydantic import BaseModel, Field
from typing_extensions import TypedDict


# ─────────────────────────────────────────────────────────────────────────────
# Enums & Constants
# ─────────────────────────────────────────────────────────────────────────────

class BookSection(str, Enum):
    FRONT_MATTER = "front_matter"
    NARRATIVE_BODY = "narrative_body"
    BACK_MATTER = "back_matter"


class ChapterStatus(str, Enum):
    PENDING = "pending"
    DRAFTING = "drafting"
    AWAITING_APPROVAL = "awaiting_approval"
    APPROVED = "approved"
    SUMMARISED = "summarised"
    PRUNED = "pruned"


class NodeName(str, Enum):
    """Canonical node names used throughout the graph."""
    PLANNER = "planner"
    FRONT_MATTER_WRITER = "front_matter_writer"
    CHAPTER_WRITER = "chapter_writer"
    BACK_MATTER_WRITER = "back_matter_writer"
    CONTEXT_SUMMARISER = "context_summariser"
    CONTEXT_PRUNER = "context_pruner"
    HUMAN_REVIEW = "human_review"
    ROUTER = "router"


# ─────────────────────────────────────────────────────────────────────────────
# Context Anchor — the "Story Bible"
# ─────────────────────────────────────────────────────────────────────────────

class CharacterProfile(BaseModel):
    """A single character's canonical description."""
    name: str
    role: str                       # e.g. "protagonist", "antagonist", "mentor"
    physical_description: str = ""
    personality_traits: list[str] = Field(default_factory=list)
    backstory: str = ""
    relationships: dict[str, str] = Field(default_factory=dict)  # name → relationship
    arc_summary: str = ""


class WorldbuildingEntry(BaseModel):
    """One discrete piece of world-lore (location, magic system, faction…)."""
    category: str                   # e.g. "location", "faction", "technology"
    name: str
    description: str
    rules_or_constraints: list[str] = Field(default_factory=list)


class PlotPoint(BaseModel):
    """A single narrative beat that must remain consistent across chapters."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    chapter_reference: int | None   # None = global / multi-chapter
    description: str
    is_resolved: bool = False


class StyleGuide(BaseModel):
    """Author's voice and prose style directives injected into every draft prompt."""
    pov: str = "third_person_limited"   # first_person | third_person_limited | omniscient
    tense: str = "past"                  # past | present
    tone: str = ""                       # e.g. "dark and literary, sardonic wit"
    forbidden_words: list[str] = Field(default_factory=list)
    prose_examples: list[str] = Field(default_factory=list)  # 1–3 reference paragraphs


class ContextAnchor(BaseModel):
    """
    The central story bible.  This object is serialised and injected verbatim
    (or in summarised form for tight context budgets) into every agent call.

    It is NEVER pruned — only extended as the book progresses.

    story_bible_raw
    ───────────────
    The unmodified text of story_bible.md, read from disk at session creation
    time by load_story_bible() in backend/utils/utils.py.  It is stored here
    so that every agent node can access the human-authored ground-truth rules
    directly from state, without an additional filesystem read.
    """
    # ── Human-authored ground truth (loaded from story_bible.md) ─────────────
    story_bible_raw: str = Field(
        default="",
        description="Raw text of story_bible.md, injected at session creation.",
    )

    # Book identity
    book_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = ""
    genre: str = ""
    target_audience: str = ""
    premise: str = ""               # ≤ 3 sentences; the elevator pitch
    logline: str = ""               # Single sentence hook

    # Story structure
    total_chapters: int = 10
    chapter_outline: list[dict[str, Any]] = Field(default_factory=list)
    # ^ list of {chapter_number, title, one_sentence_summary, key_events}

    # Characters & world
    characters: list[CharacterProfile] = Field(default_factory=list)
    worldbuilding: list[WorldbuildingEntry] = Field(default_factory=list)

    # Plot continuity
    plot_points: list[PlotPoint] = Field(default_factory=list)
    resolved_cliffhangers: list[str] = Field(default_factory=list)
    unresolved_threads: list[str] = Field(default_factory=list)

    # Style
    style_guide: StyleGuide = Field(default_factory=StyleGuide)

    # Meta
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


# ─────────────────────────────────────────────────────────────────────────────
# Chapter-Level Memory
# ─────────────────────────────────────────────────────────────────────────────

class ChapterSummary(BaseModel):
    """
    Compressed record of a completed chapter.  Lives in short-term memory and
    is injected into subsequent chapter prompts as a rolling recap.

    Raw prose is pruned once this summary is validated by the human reviewer.
    """
    chapter_number: int
    title: str = ""
    status: ChapterStatus = ChapterStatus.PENDING

    # Content snapshots
    summary: str = ""               # 100–200 word narrative summary
    key_events_bullet: list[str] = Field(default_factory=list)
    character_state_delta: dict[str, str] = Field(default_factory=dict)
    # ^ {character_name: "short description of how they changed this chapter"}
    ending_hook: str = ""           # last beat; carried into next chapter's context

    # Accounting
    word_count: int = 0
    draft_iterations: int = 0
    approved_at: str | None = None
    model_used: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# Working Memory — the active draft window
# ─────────────────────────────────────────────────────────────────────────────

class DraftSegment(BaseModel):
    """
    One atomic unit of prose produced in a single LLM call.
    Multiple segments are concatenated to form a chapter draft.
    """
    segment_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    chapter_number: int
    sequence_index: int             # order within the chapter
    raw_text: str = ""
    token_count: int = 0
    model_used: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class WorkingMemory(BaseModel):
    """
    Holds the *current* chapter's in-progress draft and recent context.
    Once the chapter is summarised and approved, raw segments are pruned.
    """
    current_chapter: int = 0
    current_section: BookSection = BookSection.FRONT_MATTER
    active_draft_segments: list[DraftSegment] = Field(default_factory=list)
    # Assembled prose (concatenation of segments); pruned after summarisation
    current_draft_text: str = ""
    current_word_count: int = 0

    # Rolling window: last N chapter summaries kept hot in working memory
    recent_chapter_summaries: list[ChapterSummary] = Field(default_factory=list)

    # Token budget tracking
    estimated_tokens_used: int = 0
    context_window_limit: int = 128_000  # gpt-4o / gpt-4o-mini


# ─────────────────────────────────────────────────────────────────────────────
# Human-in-the-Loop Control
# ─────────────────────────────────────────────────────────────────────────────

class HumanFeedback(BaseModel):
    """Structured payload the human reviewer submits at each HITL checkpoint."""
    decision: str = "approve"       # "approve" | "revise" | "reject"
    revision_notes: str = ""
    approved_at: str | None = None
    reviewer_id: str = "human"


# ─────────────────────────────────────────────────────────────────────────────
# Pipeline Control & Routing
# ─────────────────────────────────────────────────────────────────────────────

class PipelineControl(BaseModel):
    """Flags that drive the LangGraph conditional edges / routing logic."""
    current_node: NodeName = NodeName.PLANNER
    next_node: NodeName | None = None

    # HITL
    human_approval_required: bool = False
    human_feedback: HumanFeedback | None = None

    # Error handling
    retry_count: int = 0
    max_retries: int = 3
    last_error: str | None = None

    # Completion flags
    front_matter_complete: bool = False
    all_chapters_complete: bool = False
    back_matter_complete: bool = False
    book_complete: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# Top-Level LangGraph State
# ─────────────────────────────────────────────────────────────────────────────

class BookWriterState(TypedDict):
    """
    The canonical LangGraph state schema.

    All nodes receive and return subsets of this dict.  LangGraph merges
    returned partials via the reducers defined in the `Annotated` hints.

    Serialisation Strategy
    ──────────────────────
    Every field is Pydantic-serialisable.  Before checkpointing to Redis,
    the state is dumped via `state_to_json()` (see below).  On resumption,
    `state_from_json()` reconstructs the full typed state.

    Memory Tiers
    ────────────
    • Long-term  : context_anchor  (never pruned)
    • Short-term : chapter_summaries  (full list; compressed after N chapters)
    • Working    : working_memory  (pruned of raw prose after each chapter)
    • Ephemeral  : messages  (LangChain message list; managed by add_messages)
    """

    # ── Long-term memory (Story Bible) ──────────────────────────────────────
    context_anchor: ContextAnchor

    # ── Short-term memory (rolling chapter record) ───────────────────────────
    chapter_summaries: list[ChapterSummary]

    # ── Working memory (active draft window) ─────────────────────────────────
    working_memory: WorkingMemory

    # ── Pipeline control ─────────────────────────────────────────────────────
    pipeline_control: PipelineControl

    # ── Front / Back matter draft storage ────────────────────────────────────
    front_matter_draft: str
    back_matter_draft: str

    # ── Plan-and-Execute fields (used by nodes.py) ───────────────────────────
    #
    # plan         : Ordered queue of chapter task dicts generated by plan_step.
    #                Each item has keys: chapter_number, title, target_word_count,
    #                one_sentence_summary, key_events, writing_directive,
    #                continuity_hooks.  execute_step reads plan[0]; replan_step
    #                pops plan[0] after the draft is summarised.
    #
    # past_steps   : Compressed one-paragraph summaries of completed chapters,
    #                appended by replan_step.  Injected into execute_step prompts
    #                instead of raw prior prose to keep the context window lean.
    #
    # current_draft: Raw prose for the chapter currently being written, produced
    #                by execute_step.  Wiped to "" by replan_step after the
    #                summary is extracted, freeing the context window.
    plan: list[dict]
    past_steps: list[str]
    current_draft: str
    current_research_notes: str
    full_manuscript: str

    # ── LangChain message history (append-only via add_messages reducer) ─────
    messages: Annotated[list, add_messages]

    # ── Run metadata ─────────────────────────────────────────────────────────
    run_id: str
    session_id: str
    created_at: str
    updated_at: str


# ─────────────────────────────────────────────────────────────────────────────
# State Helpers
# ─────────────────────────────────────────────────────────────────────────────

def initial_state(
    *,
    book_title: str = "",
    genre: str = "",
    premise: str = "",
    total_chapters: int = 10,
    session_id: str | None = None,
    story_bible_raw: str = "",
) -> BookWriterState:
    """
    Factory that produces a clean initial BookWriterState for a new book run.

    Parameters
    ----------
    story_bible_raw : str
        The full text of story_bible.md, obtained by calling
        ``backend.utils.utils.load_story_bible()`` before invoking the graph.
        Stored inside ContextAnchor so every agent node can access it from
        state without an additional filesystem read.

    Usage::

        from backend.core.state import initial_state
        from backend.utils.utils import load_story_bible

        state = initial_state(
            book_title="The Silent Meridian",
            genre="sci-fi thriller",
            premise="A deep-space cartographer discovers the galaxy's edge is a lie.",
            total_chapters=12,
            story_bible_raw=load_story_bible(),
        )
        graph.invoke(state)
    """
    now = datetime.utcnow().isoformat()
    sid = session_id or str(uuid.uuid4())

    anchor = ContextAnchor(
        story_bible_raw=story_bible_raw,
        title=book_title,
        genre=genre,
        premise=premise,
        total_chapters=total_chapters,
        created_at=now,
        last_updated=now,
    )

    return BookWriterState(
        context_anchor=anchor,
        chapter_summaries=[],
        working_memory=WorkingMemory(
            current_chapter=0,
            current_section=BookSection.FRONT_MATTER,
        ),
        pipeline_control=PipelineControl(),
        front_matter_draft="",
        back_matter_draft="",
        # Plan-and-Execute fields — all empty until plan_step runs
        plan=[],
        past_steps=[],
        current_draft="",
        current_research_notes="",
        full_manuscript="",
        messages=[],
        run_id=str(uuid.uuid4()),
        session_id=sid,
        created_at=now,
        updated_at=now,
    )


def state_to_json(state: BookWriterState) -> dict:
    """
    Serialise BookWriterState to a JSON-safe dict for Redis checkpointing.
    Pydantic models are dumped via .model_dump(); plain dicts pass through.
    """
    import json

    def _serialise(v: Any) -> Any:
        if isinstance(v, BaseModel):
            return v.model_dump()
        if isinstance(v, list):
            return [_serialise(i) for i in v]
        if isinstance(v, dict):
            return {k: _serialise(val) for k, val in v.items()}
        return v

    return {k: _serialise(v) for k, v in state.items()}


def state_from_json(data: dict) -> BookWriterState:
    """
    Deserialise a Redis checkpoint dict back into a fully-typed BookWriterState.
    """
    return BookWriterState(
        context_anchor=ContextAnchor(**data["context_anchor"]),
        chapter_summaries=[
            ChapterSummary(**cs) for cs in data.get("chapter_summaries", [])
        ],
        working_memory=WorkingMemory(**data["working_memory"]),
        pipeline_control=PipelineControl(**data["pipeline_control"]),
        front_matter_draft=data.get("front_matter_draft", ""),
        back_matter_draft=data.get("back_matter_draft", ""),
        # Plan-and-Execute fields — restored from checkpoint
        plan=data.get("plan", []),
        past_steps=data.get("past_steps", []),
        current_draft=data.get("current_draft", ""),
        current_research_notes=data.get("current_research_notes", ""),
        full_manuscript=data.get("full_manuscript", ""),
        messages=data.get("messages", []),
        run_id=data["run_id"],
        session_id=data["session_id"],
        created_at=data["created_at"],
        updated_at=data["updated_at"],
    )
