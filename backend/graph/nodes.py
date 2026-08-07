"""
nodes.py — Plan-and-Execute LangGraph Node Implementations
===========================================================
Implements the three core nodes of the Plan-and-Execute book-writing loop:

  ┌─────────────┐     ┌──────────────┐     ┌──────────────┐
  │  plan_step  │────▶│ execute_step │────▶│ replan_step  │
  │             │     │              │     │              │
  │ orchestrate │     │   drafting   │     │ orchestrate  │
  │ gpt-4o-mini │     │   gpt-4o     │     │ gpt-4o-mini  │
  └─────────────┘     └──────────────┘     └──────┬───────┘
         ▲                                         │
         └─────────────── loop until plan=[] ──────┘

Model routing
─────────────
  orchestration_llm  gpt-4o-mini  temp=0.2
    → plan_step  : generates full chapter plan as structured JSON
    → replan_step: summarises completed prose; advances the plan queue

  drafting_llm  gpt-4o  temp=0.7
    → execute_step: writes all creative prose; never used for JSON/logic

Context isolation guarantee
───────────────────────────
  execute_step receives ONLY:
    • context_anchor.story_bible_raw  (human-authored hard rules — always first)
    • context_anchor structured fields (title, genre, style, characters…)
    • plan[0]  (the current chapter's task descriptor — nothing else from the plan)
    • past_steps  (compressed one-paragraph summaries — NOT raw prior prose)
  Raw prose from previous chapters is deliberately purged in replan_step
  before the next execute_step call, keeping the context window lean.

Error handling
──────────────
  • JSON parse failures in plan_step fall back to a single-item emergency plan.
  • All LLM calls use tenacity retry with exponential back-off (3 attempts).
  • Structured logging via Python's stdlib logging (structlog-compatible).
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from backend.core.config import settings
from backend.core.state import BookWriterState
from backend.utils.prompt_builder import build_context_anchor_block
from backend.utils.utils import (
    load_audience_personas,
    load_book_outline,
    load_case_studies,
    load_expansion_framework,
    load_stylistic_examples,
    load_system_rules,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# LLM Instantiation & Routing
# ─────────────────────────────────────────────────────────────────────────────

#: Cheap, deterministic model for planning, summarising, and JSON formatting.
#: Temperature 0.2 keeps output structured and reproducible.
orchestration_llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.2,
    api_key=settings.openai_api_key,
    max_retries=2,          # LangChain-level retries (before tenacity kicks in)
)

#: High-capability model reserved exclusively for creative prose drafting.
#: Temperature 0.7 provides creative range without incoherence.
drafting_llm = ChatOpenAI(
    model="gpt-4o",
    temperature=0.7,
    api_key=settings.openai_api_key,
    max_tokens=settings.max_tokens_per_segment,
    max_retries=2,
)


# ─────────────────────────────────────────────────────────────────────────────
# Shared Prompt Templates
# ─────────────────────────────────────────────────────────────────────────────

_PLAN_SYSTEM = """\
You are a master literary architect and outlining agent.

Your sole responsibility is to read the provided Story Bible and produce a
complete, ordered chapter plan for the book in valid JSON — nothing else.

━━━ OUTPUT FORMAT ━━━
Return ONLY a JSON object with a single key "plan" whose value is an ordered
array of chapter objects.  Each chapter object must have these exact keys:

{
  "plan": [
    {
      "chapter_number": 1,
      "title": "Short evocative chapter title",
      "target_word_count": 1500,
      "one_sentence_summary": "What this chapter proves or reveals",
      "key_events": [
        "Event or beat 1",
        "Event or beat 2",
        "Event or beat 3"
      ],
      "writing_directive": "Specific instruction to the drafting agent about \
tone, pacing, or structural requirement for this chapter",
      "continuity_hooks": [
        "A fact or thread that MUST carry into the next chapter"
      ]
    }
  ]
}

━━━ CONSTRAINTS ━━━
1. The number of chapters must match total_chapters in the Story Bible exactly.
2. key_events must contain 3–5 items per chapter.
3. writing_directive must be specific and actionable (≥ 20 words).
4. Do NOT invent characters or terms not present in the Story Bible.
5. Output ONLY the JSON object — no prose, no markdown fences, no explanation.
"""

_PLAN_HUMAN = """\
{book_outline_block}

{anchor_block}

━━━ TASK ━━━
Using the Story Bible and Book Outline above as your binding contracts,
generate the complete chapter plan for a book with the following parameters:

  Title            : {title}
  Genre            : {genre}
  Target audience  : {target_audience}
  Total chapters   : {total_chapters}
  Premise          : {premise}

⚠️  CRITICAL: The plan you output must follow the chapter structure, sub-section
order, opening scenes, beats, and word targets defined in the BOOK OUTLINE above.
Do NOT invent a different structure. Do NOT merge or reorder chapters.
Do NOT add chapters beyond total_chapters.

Produce the JSON plan now.
"""


_EXECUTE_SYSTEM = """\
{system_rules}

{expansion_framework}

{audience_personas}

{stylistic_examples}

{case_studies}

━━━ ADDITIONAL CRAFT RULES ━━━
You are a professional author writing in {pov} POV, {tense} tense.
Tone: {tone}

1. Write in continuous, flowing prose — no meta-commentary, no JSON.
2. Maintain strict continuity with the PAST STEPS summaries. Do not contradict any established fact.
3. Follow the writing_directive in the CURRENT TASK exactly.
4. Cover ALL key_events listed in the CURRENT TASK. Do not skip any.
5. Reach the target_word_count (±10%). Do not stop early.
6. End the chapter with the required Actionable Takeaway section as specified in system_rules.md.
"""

_EXECUTE_HUMAN = """\
{anchor_block}

━━━ PAST STEPS (summaries of previously written chapters) ━━━
{past_steps_block}

━━━ CURRENT TASK ━━━
Chapter {chapter_number}: {title}
Target word count : {target_word_count}
One-sentence goal : {one_sentence_summary}

Key events to cover (in order):
{key_events_block}

Writing directive:
{writing_directive}

Continuity hooks (must be present near chapter end):
{continuity_hooks_block}

━━━ BEGIN CHAPTER PROSE ━━━
"""


_REPLAN_SYSTEM = """\
You are a narrative continuity editor specialising in high-density compression.

Your sole responsibility is to read the raw chapter prose provided and produce
a concise, factually complete summary that future chapters can use as context.

━━━ OUTPUT FORMAT ━━━
Return ONLY a JSON object with a single key "summary":

{
  "summary": "A single paragraph (100–200 words) that captures: (a) the main
argument or events, (b) any character changes, (c) the chapter's ending state
and any open threads.  Written in past tense.  No evaluation, no editorialising."
}

━━━ CONSTRAINTS ━━━
1. The summary must be factually faithful — do not invent or omit events.
2. Named entities (characters, terms) must appear exactly as in the source.
3. Output ONLY the JSON object — no prose, no markdown fences, no explanation.
"""

_REPLAN_HUMAN = """\
Chapter {chapter_number}: {title}

━━━ RAW PROSE ━━━
{current_draft}

━━━ TASK ━━━
Produce the JSON summary of this chapter now.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _extract_global_rules(story_bible_raw: str) -> str:
    """
    Pull the '# Global Rules' section out of story_bible.md for direct
    injection into the execute_step system prompt.  Falls back to the full
    story bible if the section cannot be found.
    """
    match = re.search(
        r"^#\s+Global Rules\s*\n(.*?)(?=^#\s|\Z)",
        story_bible_raw,
        re.MULTILINE | re.DOTALL,
    )
    if match:
        return match.group(1).strip()
    logger.warning("'# Global Rules' section not found in story_bible.md; using full text")
    return story_bible_raw.strip()


def _parse_json_response(raw: str, fallback: Any, label: str) -> Any:
    """
    Robustly parse a JSON string from an LLM response.

    Strips markdown fences (```json … ```) if the model disobeys instructions,
    then attempts json.loads.  On failure, logs the error and returns fallback.
    """
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        logger.error(
            "%s — JSON parse failed: %s\nRaw output (first 500 chars): %s",
            label,
            exc,
            raw[:500],
        )
        return fallback


@retry(
    retry=retry_if_exception_type(Exception),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(3),
    reraise=True,
)
async def _call_orchestration(messages: list) -> str:
    """Invoke orchestration_llm with tenacity retry; returns content string."""
    response = await orchestration_llm.ainvoke(messages)
    return response.content


@retry(
    retry=retry_if_exception_type(Exception),
    wait=wait_exponential(multiplier=1, min=4, max=60),
    stop=stop_after_attempt(3),
    reraise=True,
)
async def _call_drafting(messages: list) -> str:
    """Invoke drafting_llm with tenacity retry; returns content string."""
    response = await drafting_llm.ainvoke(messages)
    return response.content


# ─────────────────────────────────────────────────────────────────────────────
# Node 1 — plan_step
# ─────────────────────────────────────────────────────────────────────────────

async def plan_step(state: BookWriterState) -> dict:
    """
    LangGraph node — Orchestration: generate the full chapter plan.

    Reads the Context Anchor (story bible + structured metadata) and prompts
    ``orchestration_llm`` (gpt-4o-mini) to output a structured JSON plan list.

    State mutations
    ───────────────
    • plan        ← list of chapter dicts (ordered execution queue)
    • updated_at  ← current timestamp

    The plan list is the master queue for the Plan-and-Execute loop.
    ``execute_step`` will always consume ``plan[0]`` and ``replan_step``
    will pop it after the draft is summarised.
    """
    anchor = state["context_anchor"]

    logger.info(
        "plan_step | title=%r | total_chapters=%d",
        anchor.title,
        anchor.total_chapters,
    )

    anchor_block = build_context_anchor_block(anchor)

    # Load the book outline fresh from disk — constrains the planner to the
    # pre-approved scene roadmap rather than inventing its own structure.
    book_outline = load_book_outline()
    book_outline_block = (
        "━" * 52 + "\n"
        "BOOK OUTLINE (BINDING CONTRACT — FOLLOW EXACTLY)\n"
        "━" * 52 + "\n"
        + book_outline.strip()
    )

    system_msg = SystemMessage(content=_PLAN_SYSTEM)
    human_msg = HumanMessage(
        content=_PLAN_HUMAN.format(
            book_outline_block=book_outline_block,
            anchor_block=anchor_block,
            title=anchor.title or "(untitled — generate a title)",
            genre=anchor.genre,
            target_audience=anchor.target_audience,
            total_chapters=anchor.total_chapters,
            premise=anchor.premise,
        )
    )

    raw = await _call_orchestration([system_msg, human_msg])

    # ── Parse JSON ────────────────────────────────────────────────────────────
    emergency_plan = [
        {
            "chapter_number": i + 1,
            "title": f"Chapter {i + 1}",
            "target_word_count": settings.target_words_per_chapter,
            "one_sentence_summary": f"Chapter {i + 1} of {anchor.total_chapters}",
            "key_events": ["(to be determined)"],
            "writing_directive": (
                f"Write chapter {i + 1} following the story bible rules."
            ),
            "continuity_hooks": [],
        }
        for i in range(anchor.total_chapters)
    ]

    parsed = _parse_json_response(
        raw,
        fallback={"plan": emergency_plan},
        label="plan_step",
    )
    plan: list[dict] = parsed.get("plan", emergency_plan)

    logger.info("plan_step | generated %d chapter tasks", len(plan))

    return {
        "plan": plan,
        "updated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Node 2 — execute_step
# ─────────────────────────────────────────────────────────────────────────────

async def execute_step(state: BookWriterState) -> dict:
    """
    LangGraph node — Creative: draft the prose for the current chapter.

    Extracts ``plan[0]`` (the active task) and constructs a tightly scoped
    prompt for ``drafting_llm`` (gpt-4o).  The prompt contains:

      1. Story Bible hard constraints (from context_anchor.story_bible_raw)
      2. Structured anchor block (title, genre, characters, world, threads)
      3. ``past_steps`` summaries — compressed, no raw prior prose
      4. The current task descriptor (plan[0] only — not the full plan)

    State mutations
    ───────────────
    • current_draft ← full prose for this chapter
    • updated_at    ← current timestamp

    Context isolation
    ─────────────────
    Raw prose from previous chapters is intentionally excluded — only the
    compressed ``past_steps`` summaries are injected.  This keeps the active
    context window to a predictable, manageable size regardless of book length.
    """
    anchor = state["context_anchor"]
    plan: list[dict] = state["plan"]
    past_steps: list[str] = state["past_steps"]

    if not plan:
        logger.warning("execute_step called with an empty plan — returning no-op")
        return {"current_draft": "", "updated_at": datetime.utcnow().isoformat()}

    task: dict = plan[0]
    chapter_num: int = task.get("chapter_number", 1)
    title: str = task.get("title", f"Chapter {chapter_num}")

    logger.info(
        "execute_step | chapter=%d | title=%r | target_words=%d",
        chapter_num,
        title,
        task.get("target_word_count", settings.target_words_per_chapter),
    )

    # ── Build prompt blocks ───────────────────────────────────────────────────
    anchor_block = build_context_anchor_block(anchor)

    # Load all drafting guidance files fresh on every call
    system_rules_text = load_system_rules()
    expansion_framework_text = load_expansion_framework()
    audience_personas_text = load_audience_personas()
    stylistic_examples_text = load_stylistic_examples()
    case_studies_text = load_case_studies()

    if past_steps:
        past_steps_block = "\n\n".join(
            f"[Chapter {i + 1} summary]\n{summary}"
            for i, summary in enumerate(past_steps)
        )
    else:
        past_steps_block = "(This is the first chapter — no prior summaries.)"

    key_events_block = "\n".join(
        f"  {idx + 1}. {event}"
        for idx, event in enumerate(task.get("key_events", []))
    )

    continuity_hooks_block = "\n".join(
        f"  • {hook}"
        for hook in task.get("continuity_hooks", [])
    ) or "  (none specified)"

    # ── System prompt (guidance docs + craft rules) ───────────────────────────
    style = anchor.style_guide
    system_content = _EXECUTE_SYSTEM.format(
        system_rules=system_rules_text,
        expansion_framework=expansion_framework_text,
        audience_personas=audience_personas_text,
        stylistic_examples=stylistic_examples_text,
        case_studies=case_studies_text,
        pov=style.pov,
        tense=style.tense,
        tone=style.tone or "professional, warm, and precise",
    )

    # ── Human prompt (context + task) ─────────────────────────────────────────
    human_content = _EXECUTE_HUMAN.format(
        anchor_block=anchor_block,
        past_steps_block=past_steps_block,
        chapter_number=chapter_num,
        title=title,
        target_word_count=task.get("target_word_count", settings.target_words_per_chapter),
        one_sentence_summary=task.get("one_sentence_summary", ""),
        key_events_block=key_events_block,
        writing_directive=task.get("writing_directive", "Write the chapter."),
        continuity_hooks_block=continuity_hooks_block,
    )

    raw_prose = await _call_drafting(
        [SystemMessage(content=system_content), HumanMessage(content=human_content)]
    )

    word_count = len(raw_prose.split())
    logger.info(
        "execute_step | chapter=%d | drafted %d words",
        chapter_num,
        word_count,
    )

    return {
        "current_draft": raw_prose,
        "updated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Node 3 — replan_step
# ─────────────────────────────────────────────────────────────────────────────

async def replan_step(state: BookWriterState) -> dict:
    """
    LangGraph node — Orchestration: summarise, advance queue, prune draft.

    Three operations in one atomic state update:

      1. SUMMARISE  — prompt orchestration_llm to compress current_draft into
                      a 100–200 word high-density summary (JSON).
      2. ADVANCE    — pop plan[0] (the completed task) from the plan queue.
      3. PRUNE      — wipe current_draft to free the context window.

    The summary is appended to past_steps, making it available to the next
    execute_step call as compressed prior context.

    State mutations
    ───────────────
    • past_steps   ← past_steps + [new_summary]
    • plan         ← plan[1:]  (completed task removed from front)
    • current_draft ← ""  (raw prose pruned)
    • updated_at   ← current timestamp

    Idempotency
    ───────────
    If current_draft is empty (e.g., graph resumed after a crash), the node
    appends a placeholder summary and advances the plan without an LLM call.
    """
    plan: list[dict] = state["plan"]
    past_steps: list[str] = state["past_steps"]
    current_draft: str = state["current_draft"]

    if not plan:
        logger.warning("replan_step called with an empty plan — returning no-op")
        return {
            "plan": [],
            "past_steps": past_steps,
            "current_draft": "",
            "updated_at": datetime.utcnow().isoformat(),
        }

    task: dict = plan[0]
    chapter_num: int = task.get("chapter_number", len(past_steps) + 1)
    title: str = task.get("title", f"Chapter {chapter_num}")

    logger.info(
        "replan_step | summarising chapter=%d | title=%r | draft_words=%d",
        chapter_num,
        title,
        len(current_draft.split()),
    )

    # ── Guard: empty draft (e.g., crash recovery) ─────────────────────────────
    if not current_draft.strip():
        logger.warning(
            "replan_step | chapter=%d | current_draft is empty; using placeholder",
            chapter_num,
        )
        new_summary = (
            f"Chapter {chapter_num} ({title}): "
            "No draft was available for summarisation at this checkpoint."
        )
        return {
            "past_steps": past_steps + [new_summary],
            "plan": plan[1:],
            "current_draft": "",
            "updated_at": datetime.utcnow().isoformat(),
        }

    # ── Prompt orchestration_llm for summary ──────────────────────────────────
    system_msg = SystemMessage(content=_REPLAN_SYSTEM)
    human_msg = HumanMessage(
        content=_REPLAN_HUMAN.format(
            chapter_number=chapter_num,
            title=title,
            current_draft=current_draft,
        )
    )

    raw = await _call_orchestration([system_msg, human_msg])

    parsed = _parse_json_response(
        raw,
        fallback={"summary": current_draft[:300] + "…"},
        label=f"replan_step (chapter {chapter_num})",
    )
    new_summary: str = parsed.get(
        "summary",
        f"Chapter {chapter_num} ({title}): summary unavailable.",
    )

    logger.info(
        "replan_step | chapter=%d | summary=%d words | plan_remaining=%d",
        chapter_num,
        len(new_summary.split()),
        len(plan) - 1,
    )

    return {
        # Append compressed summary to short-term memory
        "past_steps": past_steps + [new_summary],
        # Pop completed task from the front of the queue
        "plan": plan[1:],
        # Wipe raw prose — context window freed for the next chapter
        "current_draft": "",
        "updated_at": datetime.utcnow().isoformat(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Routing helper — used by graph.py conditional edges
# ─────────────────────────────────────────────────────────────────────────────

def should_continue(state: BookWriterState) -> str:
    """
    Conditional edge function for the Plan-and-Execute loop.

    Returns "execute" when there are still chapters in the plan queue,
    or "end" when the queue is exhausted.

    Usage in graph.py::

        graph.add_conditional_edges(
            "replan",
            should_continue,
            {"execute": "execute_step", "end": END},
        )
    """
    return "execute" if state["plan"] else "end"
