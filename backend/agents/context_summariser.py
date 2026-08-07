"""
context_summariser.py — Context Summarisation Agent Node
=========================================================
Activates when a chapter draft reaches its target word count.
Produces a structured ChapterSummary (compressed prose → short-term memory)
so the raw draft can be safely pruned from working memory.

This is the critical anti-hallucination node: it extracts only the
narratively essential information from each chapter into a compact,
LLM-parseable format that subsequent chapter writers will receive.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from backend.core.config import settings
from backend.core.state import (
    BookWriterState,
    ChapterStatus,
    ChapterSummary,
    NodeName,
    PipelineControl,
)

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a narrative continuity editor.  Given a raw chapter draft, extract the
essential story information into a structured JSON summary.

Output ONLY valid JSON matching this exact schema:
{
  "summary": "100-200 word prose recap of the chapter",
  "key_events_bullet": ["event 1", "event 2", "event 3"],
  "character_state_delta": {
    "CharacterName": "how this character changed or what happened to them"
  },
  "ending_hook": "The final beat or cliffhanger that carries into the next chapter"
}

Be precise, factual, and free of editorialising.  This summary will be injected
verbatim into subsequent chapter prompts — accuracy is critical.
"""


async def context_summariser_node(state: BookWriterState) -> dict:
    """
    LangGraph node: summarises the current chapter draft and appends the result
    to the chapter_summaries list.  Sets human_approval_required = True so the
    human can review the summary before pruning begins.
    """
    wm = state["working_memory"]
    anchor = state["context_anchor"]
    ctrl: PipelineControl = state["pipeline_control"]

    chapter_num = wm.current_chapter
    draft_text = wm.current_draft_text

    # Find chapter title from outline
    outline_entry = next(
        (c for c in anchor.chapter_outline if c["chapter_number"] == chapter_num),
        {"title": f"Chapter {chapter_num}"},
    )

    llm = ChatOpenAI(
        model=settings.fast_model,
        temperature=settings.fast_model_temperature,
        api_key=settings.openai_api_key,
        response_format={"type": "json_object"},
    )

    user_prompt = (
        f"Chapter {chapter_num}: {outline_entry.get('title', '')}\n\n"
        f"--- RAW DRAFT ---\n{draft_text}\n--- END DRAFT ---\n\n"
        "Produce the structured summary JSON now."
    )

    response = await llm.ainvoke(
        [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
    )

    data = json.loads(response.content)

    chapter_summary = ChapterSummary(
        chapter_number=chapter_num,
        title=outline_entry.get("title", f"Chapter {chapter_num}"),
        status=ChapterStatus.AWAITING_APPROVAL,
        summary=data.get("summary", ""),
        key_events_bullet=data.get("key_events_bullet", []),
        character_state_delta=data.get("character_state_delta", {}),
        ending_hook=data.get("ending_hook", ""),
        word_count=wm.current_word_count,
        draft_iterations=len(wm.active_draft_segments),
        model_used=settings.fast_model,
    )

    existing = state["chapter_summaries"]
    updated_summaries = [
        cs if cs.chapter_number != chapter_num else chapter_summary
        for cs in existing
    ] if any(cs.chapter_number == chapter_num for cs in existing) else existing + [chapter_summary]

    logger.info(
        "Summarised chapter %d (%d words → %d word summary)",
        chapter_num,
        wm.current_word_count,
        len(chapter_summary.summary.split()),
    )

    return {
        "chapter_summaries": updated_summaries,
        "pipeline_control": ctrl.model_copy(
            update={
                "current_node": NodeName.CONTEXT_SUMMARISER,
                "human_approval_required": True,   # pause for HITL
            }
        ),
        "updated_at": datetime.utcnow().isoformat(),
    }
