"""
back_matter.py — Back Matter Writer Agent Node
===============================================
Generates acknowledgements, bibliography/references, glossary, and
a "About the Author" page once all chapters are complete.
"""

from __future__ import annotations

import logging
from datetime import datetime

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from backend.core.config import settings
from backend.core.state import (
    BookSection,
    BookWriterState,
    NodeName,
    PipelineControl,
)
from backend.utils.prompt_builder import build_context_anchor_block

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a professional editor finalising a book manuscript.
Given the Context Anchor and all chapter summaries, write polished back matter.

Back matter must include, delimited by markdown headers:
# Acknowledgements
# Glossary  (only if the genre warrants it — sci-fi, fantasy, etc.)
# About the Author  (written in third person, 1 paragraph)
# A Note on Sources  (if non-fiction elements exist)

Do NOT recap plot events. Keep tone consistent with the style guide.
"""


async def back_matter_node(state: BookWriterState) -> dict:
    """LangGraph node: drafts all back matter elements."""
    anchor = state["context_anchor"]
    ctrl: PipelineControl = state["pipeline_control"]
    chapter_summaries = state["chapter_summaries"]

    anchor_block = build_context_anchor_block(anchor)
    summaries_block = "\n\n".join(
        f"Chapter {cs.chapter_number} — {cs.title}:\n{cs.summary}"
        for cs in chapter_summaries
    )

    llm = ChatOpenAI(
        model=settings.creative_model,
        temperature=settings.creative_model_temperature,
        api_key=settings.openai_api_key,
    )

    user_prompt = (
        f"{anchor_block}\n\n"
        f"=== Chapter Summaries ===\n{summaries_block}\n\n"
        "Write the complete back matter for this book now."
    )

    response = await llm.ainvoke(
        [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
    )

    back_matter_text = response.content
    logger.info("Back matter drafted (%d words)", len(back_matter_text.split()))

    return {
        "back_matter_draft": back_matter_text,
        "pipeline_control": ctrl.model_copy(
            update={
                "current_node": NodeName.BACK_MATTER_WRITER,
                "back_matter_complete": True,
                "book_complete": True,
                "human_approval_required": True,
            }
        ),
        "updated_at": datetime.utcnow().isoformat(),
    }
