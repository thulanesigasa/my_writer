"""
planner.py — Planner Agent Node
================================
Responsible for bootstrapping the Context Anchor and generating the full
chapter outline before any prose is written.
Uses gpt-4o-mini with structured JSON output.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from backend.core.config import settings
from backend.core.state import (
    BookWriterState,
    ContextAnchor,
    NodeName,
    PipelineControl,
    StyleGuide,
)

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are a master literary architect. Given a book brief, you will produce a
structured chapter outline in valid JSON — nothing else.

The JSON must follow this exact schema:
{
  "title": "string",
  "logline": "string (one gripping sentence)",
  "total_chapters": int,
  "style_guide": {
    "pov": "third_person_limited",
    "tense": "past",
    "tone": "string"
  },
  "chapter_outline": [
    {
      "chapter_number": 1,
      "title": "string",
      "one_sentence_summary": "string",
      "key_events": ["string", "string"]
    }
  ]
}

Be specific, be compelling, honour the genre and premise provided.
"""


async def planner_node(state: BookWriterState) -> dict:
    """
    LangGraph node: generates the master chapter outline and populates
    the ContextAnchor with structural metadata.
    """
    anchor: ContextAnchor = state["context_anchor"]

    llm = ChatOpenAI(
        model=settings.fast_model,
        temperature=settings.fast_model_temperature,
        api_key=settings.openai_api_key,
        response_format={"type": "json_object"},
    )

    user_prompt = (
        f"Book title: {anchor.title or 'TBD'}\n"
        f"Genre: {anchor.genre}\n"
        f"Premise: {anchor.premise}\n"
        f"Target audience: {anchor.target_audience}\n"
        f"Total chapters requested: {anchor.total_chapters}\n\n"
        "Generate the full chapter outline now."
    )

    response = await llm.ainvoke(
        [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
    )

    plan = json.loads(response.content)
    logger.info("Planner produced outline with %d chapters", len(plan.get("chapter_outline", [])))

    # Merge plan into ContextAnchor
    updated_anchor = anchor.model_copy(
        update={
            "title": plan.get("title", anchor.title),
            "logline": plan.get("logline", ""),
            "total_chapters": plan.get("total_chapters", anchor.total_chapters),
            "chapter_outline": plan.get("chapter_outline", []),
            "style_guide": StyleGuide(**plan.get("style_guide", {})),
            "last_updated": datetime.utcnow().isoformat(),
        }
    )

    return {
        "context_anchor": updated_anchor,
        "pipeline_control": PipelineControl(
            current_node=NodeName.PLANNER,
            next_node=NodeName.FRONT_MATTER_WRITER,
        ),
        "updated_at": datetime.utcnow().isoformat(),
    }
