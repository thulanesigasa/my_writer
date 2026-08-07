"""
memory.py — Redis-backed Memory Manager
========================================
Wraps the three memory tiers used by the book-writing pipeline:

  • Long-term  → ContextAnchor (story bible, never evicted)
  • Short-term → ChapterSummary list (compressed rolling window)
  • Working    → Active draft segments (pruned after chapter approval)

Also exposes a helper for LangGraph checkpoint persistence via the
langgraph-checkpoint-redis saver.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import redis.asyncio as aioredis
from langgraph.checkpoint.redis import AsyncRedisSaver

from backend.core.config import settings
from backend.core.state import (
    BookWriterState,
    ChapterSummary,
    ContextAnchor,
    state_from_json,
    state_to_json,
)

logger = logging.getLogger(__name__)

# ─── Key templates ────────────────────────────────────────────────────────────
_KEY_STATE = "book:{session_id}:state"
_KEY_ANCHOR = "book:{session_id}:anchor"
_KEY_SUMMARIES = "book:{session_id}:summaries"
_KEY_WORKING = "book:{session_id}:working"


class MemoryManager:
    """
    Async context manager that owns a single aioredis client.

    Usage::

        async with MemoryManager() as mem:
            await mem.save_state(session_id, state)
            state = await mem.load_state(session_id)
    """

    def __init__(self) -> None:
        self._client: aioredis.Redis | None = None

    async def __aenter__(self) -> "MemoryManager":
        self._client = aioredis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        return self

    async def __aexit__(self, *_: Any) -> None:
        if self._client:
            await self._client.aclose()

    @property
    def client(self) -> aioredis.Redis:
        if self._client is None:
            raise RuntimeError("MemoryManager used outside of async context manager")
        return self._client

    # ── Full state ────────────────────────────────────────────────────────────

    async def save_state(self, session_id: str, state: BookWriterState) -> None:
        """Serialise and persist the full BookWriterState to Redis."""
        key = _KEY_STATE.format(session_id=session_id)
        payload = json.dumps(state_to_json(state))
        await self.client.set(key, payload, ex=settings.redis_checkpoint_ttl_seconds)
        logger.debug("Saved state for session %s", session_id)

    async def load_state(self, session_id: str) -> BookWriterState | None:
        """Retrieve and deserialise a BookWriterState from Redis."""
        key = _KEY_STATE.format(session_id=session_id)
        raw = await self.client.get(key)
        if raw is None:
            return None
        return state_from_json(json.loads(raw))

    # ── Context Anchor (long-term) ────────────────────────────────────────────

    async def save_anchor(self, session_id: str, anchor: ContextAnchor) -> None:
        key = _KEY_ANCHOR.format(session_id=session_id)
        await self.client.set(
            key,
            anchor.model_dump_json(),
            ex=settings.redis_checkpoint_ttl_seconds,
        )

    async def load_anchor(self, session_id: str) -> ContextAnchor | None:
        key = _KEY_ANCHOR.format(session_id=session_id)
        raw = await self.client.get(key)
        return ContextAnchor.model_validate_json(raw) if raw else None

    # ── Chapter Summaries (short-term) ───────────────────────────────────────

    async def append_chapter_summary(
        self, session_id: str, summary: ChapterSummary
    ) -> None:
        """Push a new chapter summary onto the Redis list."""
        key = _KEY_SUMMARIES.format(session_id=session_id)
        await self.client.rpush(key, summary.model_dump_json())
        await self.client.expire(key, settings.redis_checkpoint_ttl_seconds)

    async def load_chapter_summaries(
        self, session_id: str
    ) -> list[ChapterSummary]:
        key = _KEY_SUMMARIES.format(session_id=session_id)
        raw_list = await self.client.lrange(key, 0, -1)
        return [ChapterSummary.model_validate_json(r) for r in raw_list]

    async def load_recent_summaries(
        self, session_id: str, n: int | None = None
    ) -> list[ChapterSummary]:
        """Return the last `n` chapter summaries (default: settings.recent_summaries_in_context)."""
        n = n or settings.recent_summaries_in_context
        key = _KEY_SUMMARIES.format(session_id=session_id)
        raw_list = await self.client.lrange(key, -n, -1)
        return [ChapterSummary.model_validate_json(r) for r in raw_list]

    # ── Working memory pruning ────────────────────────────────────────────────

    async def prune_working_draft(self, session_id: str) -> None:
        """
        Called after a chapter is summarised and approved.
        Clears raw draft segments from the working memory key.
        The full state is re-saved by the caller after invoking this.
        """
        key = _KEY_WORKING.format(session_id=session_id)
        await self.client.delete(key)
        logger.info("Pruned working draft for session %s", session_id)


# ── LangGraph checkpoint saver factory ────────────────────────────────────────

def make_checkpoint_saver() -> AsyncRedisSaver:
    """
    Returns a LangGraph AsyncRedisSaver instance configured with the app's
    Redis URL.  Pass this to `StateGraph.compile(checkpointer=...)`.
    """
    return AsyncRedisSaver.from_conn_string(settings.redis_url)
