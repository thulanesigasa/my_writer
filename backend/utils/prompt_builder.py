"""
prompt_builder.py — Context-Isolated Prompt Construction Utilities
==================================================================
All prompt assembly logic lives here to keep agent nodes clean and testable.
The core principle: every prompt gets a deterministic, serialisable context
block derived solely from the ContextAnchor + rolling summaries —
never from raw prior chapter prose.
"""

from __future__ import annotations

from backend.core.state import ChapterSummary, ContextAnchor, StyleGuide


def build_context_anchor_block(anchor: ContextAnchor) -> str:
    """
    Serialise the ContextAnchor into a compact, LLM-readable block.
    This is injected at the top of every agent prompt.

    Structure (top-to-bottom, matching LLM attention priority):
      1. STORY BIBLE  — raw human-authored rules from story_bible.md (never pruned)
      2. STRUCTURED ANCHOR — derived facts (title, genre, characters, world, threads)
    """
    chars = "\n".join(
        f"  • {c.name} ({c.role}): {c.backstory or c.physical_description or 'see profile'}"
        for c in anchor.characters
    ) or "  (no characters defined yet)"

    world = "\n".join(
        f"  • [{w.category}] {w.name}: {w.description}"
        for w in anchor.worldbuilding
    ) or "  (no worldbuilding entries yet)"

    unresolved = "\n".join(f"  • {t}" for t in anchor.unresolved_threads) or "  (none)"

    style = anchor.style_guide
    forbidden = ", ".join(style.forbidden_words) if style.forbidden_words else "none"

    # ── 1. Story Bible block (human-authored hard constraints) ────────────────
    if anchor.story_bible_raw.strip():
        bible_block = (
            "╔" + "═" * 50 + "╗\n"
            "║  STORY BIBLE (HARD CONSTRAINTS — READ FIRST)      ║\n"
            "╚" + "═" * 50 + "╝\n"
            + anchor.story_bible_raw.strip()
            + "\n\n"
        )
    else:
        bible_block = ""  # no story bible loaded; skip silently

    # ── 2. Structured anchor block (AI-generated derived facts) ───────────────
    structured_block = f"""\
╔══════════════════════════════════════════╗
║         CONTEXT ANCHOR (STORY BIBLE)     ║
╚══════════════════════════════════════════╝
TITLE    : {anchor.title}
GENRE    : {anchor.genre}
LOGLINE  : {anchor.logline}
PREMISE  : {anchor.premise}
AUDIENCE : {anchor.target_audience}

STYLE GUIDE
  POV      : {style.pov}
  TENSE    : {style.tense}
  TONE     : {style.tone}
  FORBIDDEN: {forbidden}

CHARACTERS
{chars}

WORLDBUILDING
{world}

UNRESOLVED NARRATIVE THREADS
{unresolved}
"""

    return bible_block + structured_block


def build_chapter_prompt(
    *,
    anchor_block: str,
    chapter_outline: dict,
    recent_summaries: list[ChapterSummary],
    accumulated_draft: str,
    style_guide: StyleGuide,
    segment_index: int,
) -> tuple[str, str]:
    """
    Build the (system_prompt, user_prompt) pair for a chapter writing call.

    Context isolation guarantees:
      - Only the anchor_block (no raw prior chapters)
      - Only recent_summaries (compressed, not raw prose)
      - Only the current chapter's accumulated text so far
    """
    system_prompt = f"""\
You are a literary novelist writing in {style_guide.pov} POV, {style_guide.tense} tense.
Tone: {style_guide.tone}

You will receive:
  1. The Context Anchor (story bible) — ground truth for all story facts
  2. Recent chapter summaries — what has happened so far
  3. The current chapter outline — what this chapter must accomplish
  4. The draft so far for this chapter (may be empty for segment 0)

Your task: write the NEXT prose segment (~{1200} words) continuing the draft.
Do NOT summarise. Do NOT break POV. Do NOT introduce elements that contradict the Context Anchor.
End the segment at a natural narrative pause (scene break or chapter-end if appropriate).
Output ONLY the prose — no headers, no commentary.
"""

    # Summaries block
    if recent_summaries:
        summaries_block = "=== RECENT CHAPTER SUMMARIES ===\n" + "\n\n".join(
            f"Chapter {cs.chapter_number} — {cs.title}\n"
            f"Summary: {cs.summary}\n"
            f"Ending hook: {cs.ending_hook}"
            for cs in recent_summaries
        )
    else:
        summaries_block = "=== RECENT CHAPTER SUMMARIES ===\n(This is the first chapter — no prior summaries)"

    # Draft so far
    draft_block = (
        f"=== DRAFT SO FAR (Chapter {chapter_outline['chapter_number']}, segment {segment_index}) ===\n"
        + (accumulated_draft[-4000:] if accumulated_draft else "(empty — begin the chapter)")
    )

    outline_block = (
        f"=== CHAPTER {chapter_outline['chapter_number']} OUTLINE ===\n"
        f"Title: {chapter_outline.get('title', '')}\n"
        f"Summary: {chapter_outline.get('one_sentence_summary', '')}\n"
        f"Key events to cover: {', '.join(chapter_outline.get('key_events', []))}"
    )

    user_prompt = (
        f"{anchor_block}\n\n"
        f"{summaries_block}\n\n"
        f"{outline_block}\n\n"
        f"{draft_block}\n\n"
        "Continue the prose now:"
    )

    return system_prompt, user_prompt


def build_review_payload(state_dict: dict) -> dict:
    """
    Build the JSON payload sent to the frontend at each HITL checkpoint.
    Strips raw segment lists to keep the SSE payload small.
    """
    wm = state_dict.get("working_memory", {})
    ctrl = state_dict.get("pipeline_control", {})
    anchor = state_dict.get("context_anchor", {})

    chapter_num = wm.get("current_chapter", 0) if isinstance(wm, dict) else wm.current_chapter
    draft_text = wm.get("current_draft_text", "") if isinstance(wm, dict) else wm.current_draft_text
    section = getattr(ctrl, "current_node", "unknown") if not isinstance(ctrl, dict) else ctrl.get("current_node")

    return {
        "chapter_number": chapter_num,
        "current_node": str(section),
        "book_title": anchor.get("title", "") if isinstance(anchor, dict) else anchor.title,
        "draft_preview": draft_text[:2000] + ("…" if len(draft_text) > 2000 else ""),
        "word_count": len(draft_text.split()),
        "requires_action": True,
    }
