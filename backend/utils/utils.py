"""
utils.py — General-Purpose Backend Utilities
=============================================
Utility functions shared across the backend that don't belong to a single
module (i.e., not prompt assembly, not state schema, not memory management).

Exposes:
  • load_story_bible()   — reads story_bible.md   (Context Anchor / world rules)
  • load_system_rules()  — reads system_rules.md  (drafting agent hard constraints)
  • load_book_outline()  — reads book_outline.md  (planner's scene-by-scene roadmap)

All three follow the same contract: fresh filesystem read on every call,
graceful fallback on missing file, never returns None.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Path resolution ────────────────────────────────────────────────────────────
# This file lives at:  <repo_root>/backend/utils/utils.py
# Markdown files live at: <repo_root>/*.md
# Walk up three parents: utils/ → backend/ → repo_root/
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent

_STORY_BIBLE_PATH  = _REPO_ROOT / "story_bible.md"
_SYSTEM_RULES_PATH = _REPO_ROOT / "system_rules.md"
_BOOK_OUTLINE_PATH = _REPO_ROOT / "book_outline.md"


# ── Private helper ─────────────────────────────────────────────────────────────

def _load_markdown_file(target: Path, label: str) -> str:
    """
    Read *target* and return its text.  On failure, return a structured
    warning string so callers never receive None.

    Parameters
    ----------
    target : Path
        Absolute path to the markdown file.
    label : str
        Human-readable name used in log messages and fallback text.
    """
    try:
        content = target.read_text(encoding="utf-8")
        logger.info(
            "%s loaded: %s (%d chars, %d lines)",
            label,
            target,
            len(content),
            content.count("\n"),
        )
        return content

    except FileNotFoundError:
        logger.warning(
            "%s not found at %s — returning fallback warning text.", label, target
        )
        return (
            f"# {label} — MISSING FILE\n\n"
            f"WARNING: {target.name} was not found at {target}.\n"
            "The AI will run without this constraint document.\n"
            "Create the file at the path above to enable full context anchoring.\n"
        )

    except OSError as exc:
        logger.error("Failed to read %s: %s", label, exc)
        return f"# {label} — READ ERROR\n\n{exc}\n"


# ── Public loaders ─────────────────────────────────────────────────────────────

def load_story_bible(path: Path | str | None = None) -> str:
    """
    Read story_bible.md and return it as a plain string.

    Fresh filesystem read on every call — edits to the file are picked up
    on the next session creation without restarting the server.

    Parameters
    ----------
    path : Path | str | None
        Override the default path (useful for testing).
    """
    target = Path(path) if path is not None else _STORY_BIBLE_PATH
    return _load_markdown_file(target, "Story Bible (story_bible.md)")


def load_system_rules(path: Path | str | None = None) -> str:
    """
    Read system_rules.md and return it as a plain string.

    system_rules.md contains the absolute drafting constraints for the
    AI writing agent: tone, formatting, hallucination limits, forbidden
    concepts.  It is injected into the execute_step system prompt so these
    rules are the first thing the drafting LLM reads on every call.

    Parameters
    ----------
    path : Path | str | None
        Override the default path (useful for testing).

    Examples
    --------
    >>> from backend.utils.utils import load_system_rules
    >>> rules = load_system_rules()
    >>> assert "# Tone and Voice" in rules
    """
    target = Path(path) if path is not None else _SYSTEM_RULES_PATH
    return _load_markdown_file(target, "System Rules (system_rules.md)")


def load_book_outline(path: Path | str | None = None) -> str:
    """
    Read book_outline.md and return it as a plain string.

    book_outline.md is the scene-by-scene roadmap that the Planner agent
    uses as its binding contract.  It is injected into the plan_step prompt
    to constrain the generated chapter plan to the pre-approved structure.

    Parameters
    ----------
    path : Path | str | None
        Override the default path (useful for testing).

    Examples
    --------
    >>> from backend.utils.utils import load_book_outline
    >>> outline = load_book_outline()
    >>> assert "Chapter 1" in outline
    """
    target = Path(path) if path is not None else _BOOK_OUTLINE_PATH
    return _load_markdown_file(target, "Book Outline (book_outline.md)")


# ── Path helpers ───────────────────────────────────────────────────────────────

def story_bible_path() -> Path:
    """Return the resolved path to story_bible.md (useful for CLI/debugging)."""
    return _STORY_BIBLE_PATH


def system_rules_path() -> Path:
    """Return the resolved path to system_rules.md (useful for CLI/debugging)."""
    return _SYSTEM_RULES_PATH


def book_outline_path() -> Path:
    """Return the resolved path to book_outline.md (useful for CLI/debugging)."""
    return _BOOK_OUTLINE_PATH
