"""
stream.py — SSE Token Streaming Route
=======================================
GET /api/stream/{session_id}

Resumes the LangGraph graph for a session and streams LLM tokens
to the client via Server-Sent Events (SSE).

Event types:
  data: {"type": "token", "content": "..."}        — prose token
  data: {"type": "node_change", "node": "..."}     — graph node transition
  data: {"type": "hitl_pause", "payload": {...}}   — human review required
  data: {"type": "done", "message": "..."}         — graph finished
  data: {"type": "error", "message": "..."}        — error occurred
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse

from backend.core.memory import MemoryManager
from backend.graph.graph import graph
from backend.utils.prompt_builder import build_review_payload

router = APIRouter()
logger = logging.getLogger(__name__)


async def _event_generator(session_id: str):
    """
    Async generator that runs the LangGraph graph in streaming mode
    and yields SSE-formatted events.
    """
    async with MemoryManager() as mem:
        state = await mem.load_state(session_id)

    if state is None:
        yield {"data": json.dumps({"type": "error", "message": "Session not found"})}
        return

    config = {
        "configurable": {"thread_id": session_id},
        "recursion_limit": 200,
    }

    try:
        async for event in graph.astream_events(state, config=config, version="v2"):
            kind = event.get("event")
            name = event.get("name", "")
            data = event.get("data", {})

            # Token streaming from LLM calls
            if kind == "on_chat_model_stream":
                chunk = data.get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield {
                        "data": json.dumps({
                            "type": "token",
                            "content": chunk.content,
                        })
                    }

            # Node transitions
            elif kind == "on_chain_start" and name not in ("", "LangGraph"):
                yield {
                    "data": json.dumps({
                        "type": "node_change",
                        "node": name,
                    })
                }

            # HITL interrupt detected
            elif kind == "on_chain_end" and name == "LangGraph":
                output = data.get("output", {})
                ctrl = output.get("pipeline_control")
                requires_hitl = (
                    ctrl.human_approval_required
                    if hasattr(ctrl, "human_approval_required")
                    else (ctrl or {}).get("human_approval_required", False)
                )
                if requires_hitl:
                    payload = build_review_payload(output)
                    # Persist updated state
                    async with MemoryManager() as mem:
                        from backend.core.state import state_from_json, state_to_json
                        # output is the final state dict from graph run
                        await mem.save_state(session_id, output)
                    yield {
                        "data": json.dumps({
                            "type": "hitl_pause",
                            "payload": payload,
                        })
                    }
                    return

        yield {"data": json.dumps({"type": "done", "message": "Book generation complete!"})}

    except Exception as exc:
        logger.exception("Stream error for session %s", session_id)
        yield {"data": json.dumps({"type": "error", "message": str(exc)})}


@router.get("/{session_id}")
async def stream_generation(session_id: str) -> EventSourceResponse:
    """SSE endpoint — streams LangGraph execution tokens to the browser."""
    return EventSourceResponse(_event_generator(session_id))
