"""
front_matter.py — Front Matter Writer Agent Node
=================================================
Generates title page, dedication, epigraph, author's note, and table of contents.
Uses the creative model with the full Context Anchor for consistency.
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
    WorkingMemory,
)
from backend.utils.prompt_builder import build_context_anchor_block

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a professional book designer and copywriter.
Given the book's Context Anchor (story bible), write polished front matter in
the author's established voice.

Front matter must include, clearly delimited by markdown headers:
# Title Page
# Dedication
# Epigraph
# Author's Note (1–2 paragraphs)
# Table of Contents (list all chapter titles)

Keep the epigraph to a single evocative quotation (real or invented) that
resonates with the book's themes. Do NOT begin drafting chapter prose here.
"""


async def front_matter_node(state: BookWriterState) -> dict:
    """LangGraph node: drafts all front matter elements."""
    anchor = state["context_anchor"]
    ctrl: PipelineControl = state["pipeline_control"]

    anchor_block = build_context_anchor_block(anchor)

    llm = ChatOpenAI(
        model=settings.creative_model,
        temperature=settings.creative_model_temperature,
        api_key=settings.openai_api_key,
    )

    user_prompt = (
        f"{anchor_block}\n\n"
        "Write the complete front matter for this book now. "
        "Use the style guide to match the author's voice."
    )

    response = await llm.ainvoke(
        [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
    )

    front_matter_text = response.content
    logger.info("Front matter drafted (%d words)", len(front_matter_text.split()))

    updated_wm = state["working_memory"].model_copy(
        update={
            "current_section": BookSection.NARRATIVE_BODY,
            "current_chapter": 1,  # ready to start chapter 1
        }
    )

    return {
        "front_matter_draft": front_matter_text,
        "working_memory": updated_wm,
        "pipeline_control": ctrl.model_copy(
            update={
                "current_node": NodeName.FRONT_MATTER_WRITER,
                "front_matter_complete": True,
                "human_approval_required": True,   # always review front matter
                "next_node": NodeName.CHAPTER_WRITER,
            }
        ),
        "updated_at": datetime.utcnow().isoformat(),
    }
