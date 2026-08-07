"""
context_pruner.py — Context Pruning Agent Node
===============================================
Executes after a chapter has been summarised and approved by the human.
Prunes raw prose from working memory and advances the chapter counter.
This node contains NO LLM call — it is pure state manipulation.
"""

from __future__ import annotations

import logging
from datetime import datetime

from backend.core.state import (
    BookSection,
    BookWriterState,
    ChapterStatus,
    NodeName,
    PipelineControl,
    WorkingMemory,
)

logger = logging.getLogger(__name__)


async def context_pruner_node(state: BookWriterState) -> dict:
    """
    LangGraph node: clears raw draft data and advances to the next chapter.
    Marks the current chapter as PRUNED in the summaries list.
    """
    wm: WorkingMemory = state["working_memory"]
    ctrl: PipelineControl = state["pipeline_control"]
    anchor = state["context_anchor"]
    chapter_summaries = state["chapter_summaries"]

    current_chapter = wm.current_chapter
    next_chapter = current_chapter + 1
    total_chapters = anchor.total_chapters

    # Mark current chapter as pruned in summaries
    updated_summaries = [
        cs.model_copy(
            update={
                "status": ChapterStatus.PRUNED,
                "approved_at": datetime.utcnow().isoformat(),
            }
        ) if cs.chapter_number == current_chapter else cs
        for cs in chapter_summaries
    ]

    # Rolling window for working memory: only keep recent N summaries hot
    from backend.core.config import settings
    recent = updated_summaries[-settings.recent_summaries_in_context:]

    # Check completion
    all_done = next_chapter > total_chapters

    # Reset working memory for next chapter (raw prose purged)
    updated_wm = WorkingMemory(
        current_chapter=next_chapter if not all_done else current_chapter,
        current_section=BookSection.NARRATIVE_BODY if not all_done else BookSection.BACK_MATTER,
        active_draft_segments=[],
        current_draft_text="",
        current_word_count=0,
        recent_chapter_summaries=recent,
        estimated_tokens_used=0,
    )

    updated_ctrl = ctrl.model_copy(
        update={
            "current_node": NodeName.CONTEXT_PRUNER,
            "human_approval_required": False,
            "human_feedback": None,
            "all_chapters_complete": all_done,
            "next_node": NodeName.BACK_MATTER_WRITER if all_done else NodeName.CHAPTER_WRITER,
        }
    )

    logger.info(
        "Pruned chapter %d | next=%d | all_done=%s",
        current_chapter,
        next_chapter,
        all_done,
    )

    return {
        "chapter_summaries": updated_summaries,
        "working_memory": updated_wm,
        "pipeline_control": updated_ctrl,
        "updated_at": datetime.utcnow().isoformat(),
    }
