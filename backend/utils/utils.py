"""
utils.py — General-Purpose Backend Utilities
=============================================
Utility functions shared across the backend that don't belong to a single
module (i.e., not prompt assembly, not state schema, not memory management).

Currently houses:
  • load_story_bible() — reads story_bible.md from the repo root and returns
    its full text as a string.  This is the primary mechanism for injecting
    the human-authored Context Anchor into LangGraph state at startup.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Path resolution ────────────────────────────────────────────────────────────
# This file lives at:  <repo_root>/backend/utils/utils.py
# story_bible.md lives at: <repo_root>/story_bible.md
# So we walk up three parents: utils/ → backend/ → repo_root/
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_STORY_BIBLE_PATH = _REPO_ROOT / "story_bible.md"

_FALLBACK_CONTENT = """\
# Story Bible — MISSING FILE

WARNING: story_bible.md was not found at {path}.
The AI will run without hard-coded ground-truth rules.
Create the file at the path above to enable full context anchoring.
""".format(path=_STORY_BIBLE_PATH)


def load_story_bible(path: Path | str | None = None) -> str:
    """
    Read the story bible markdown file from disk and return it as a plain string.

    This function is intentionally simple and stateless — it performs a fresh
    filesystem read on every call so that edits to story_bible.md are picked up
    on the next book session creation without restarting the server.

    Parameters
    ----------
    path : Path | str | None
        Override the default path (useful for testing).  When None, resolves
        to ``<repo_root>/story_bible.md``.

    Returns
    -------
    str
        The full text of the story bible, or a structured warning string if the
        file cannot be found or read, so downstream code never receives None.

    Examples
    --------
    >>> from backend.utils.utils import load_story_bible
    >>> bible = load_story_bible()
    >>> assert "# Book Objective" in bible
    """
    target = Path(path) if path is not None else _STORY_BIBLE_PATH

    try:
        content = target.read_text(encoding="utf-8")
        logger.info(
            "Story bible loaded: %s (%d chars, %d lines)",
            target,
            len(content),
            content.count("\n"),
        )
        return content

    except FileNotFoundError:
        logger.warning(
            "story_bible.md not found at %s — using fallback warning text.", target
        )
        return _FALLBACK_CONTENT

    except OSError as exc:
        logger.error("Failed to read story_bible.md: %s", exc)
        return f"# Story Bible — READ ERROR\n\n{exc}\n"


def story_bible_path() -> Path:
    """Return the resolved path to story_bible.md (useful for CLI/debugging)."""
    return _STORY_BIBLE_PATH
