"""
chapter_writer.py — Chapter Writer Agent Node
==============================================
The primary creative node.  Drafts one prose segment per invocation using
gpt-4o (or a configured creative model), injecting the full Context Anchor
plus a rolling window of recent chapter summaries to prevent hallucination.

Context isolation strategy
──────────────────────────
• Context Anchor (story bible) — always in prompt
• Last N chapter summaries — always in prompt
• ONLY the current chapter's accumulated text as rolling context
• Raw prose from previous chapters is NEVER re-injected (it was pruned)
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from backend.core.config import settings
from backend.core.state import (
    BookSection,
    BookWriterState,
    ChapterStatus,
    DraftSegment,
    NodeName,
    PipelineControl,
    WorkingMemory,
)
from backend.utils.prompt_builder import build_chapter_prompt, build_context_anchor_block

logger = logging.getLogger(__name__)


async def chapter_writer_node(state: BookWriterState) -> dict:
    """
    LangGraph node: drafts the next prose segment for the current chapter.
    Returns an updated WorkingMemory with the new segment appended.
    """
    anchor = state["context_anchor"]
    wm: WorkingMemory = state["working_memory"]
    chapter_summaries = state["chapter_summaries"]
    ctrl: PipelineControl = state["pipeline_control"]

    # Determine which chapter we're currently drafting
    chapter_num = wm.current_chapter
    chapter_outline_entry = next(
        (c for c in anchor.chapter_outline if c["chapter_number"] == chapter_num),
        None,
    )
    if chapter_outline_entry is None:
        logger.warning("No outline entry for chapter %d — ending chapters", chapter_num)
        return {
            "pipeline_control": ctrl.model_copy(
                update={"all_chapters_complete": True, "next_node": NodeName.BACK_MATTER_WRITER}
            )
        }

    # Build context-isolated prompt
    anchor_block = build_context_anchor_block(anchor)
    recent_summaries = chapter_summaries[-settings.recent_summaries_in_context:]
    system_prompt, user_prompt = build_chapter_prompt(
        anchor_block=anchor_block,
        chapter_outline=chapter_outline_entry,
        recent_summaries=recent_summaries,
        accumulated_draft=wm.current_draft_text,
        style_guide=anchor.style_guide,
        segment_index=len(wm.active_draft_segments),
    )

    llm = ChatOpenAI(
        model=settings.creative_model,
        temperature=settings.creative_model_temperature,
        api_key=settings.openai_api_key,
        max_tokens=settings.max_tokens_per_segment,
    )

    response = await llm.ainvoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=user_prompt)]
    )

    new_text = response.content
    token_count = response.usage_metadata.get("output_tokens", 0) if response.usage_metadata else 0

    # Assemble new segment
    segment = DraftSegment(
        segment_id=str(uuid.uuid4()),
        chapter_number=chapter_num,
        sequence_index=len(wm.active_draft_segments),
        raw_text=new_text,
        token_count=token_count,
        model_used=settings.creative_model,
    )

    updated_segments = wm.active_draft_segments + [segment]
    updated_draft = wm.current_draft_text + "\n\n" + new_text
    word_count = len(updated_draft.split())

    updated_wm = wm.model_copy(
        update={
            "active_draft_segments": updated_segments,
            "current_draft_text": updated_draft,
            "current_word_count": word_count,
            "estimated_tokens_used": wm.estimated_tokens_used + token_count,
        }
    )

    logger.info(
        "Chapter %d | segment %d | %d words so far",
        chapter_num,
        segment.sequence_index,
        word_count,
    )

    return {
        "working_memory": updated_wm,
        "pipeline_control": ctrl.model_copy(
            update={"current_node": NodeName.CHAPTER_WRITER}
        ),
        "updated_at": datetime.utcnow().isoformat(),
    }
