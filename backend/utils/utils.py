"""
utils.py — General-Purpose Backend Utilities
=============================================
Utility functions shared across the backend that don't belong to a single
module (i.e., not prompt assembly, not state schema, not memory management).

Exposes individual loaders:
  • load_story_bible()           — reads story_bible.md (Context Anchor)
  • load_system_rules()          — reads system_rules.md (drafting agent hard constraints)
  • load_book_outline()          — reads book_outline.md (planner's scene roadmap)
  • load_case_studies()          — reads case_studies.md (empirical stories)
  • load_audience_personas()     — reads audience_personas.md (Jordan & Sam profiles)
  • load_stylistic_examples()    — reads stylistic_examples.md (DO/DO NOT voice cloned prose)
  • load_front_and_back_matter() — reads front_and_back_matter.md (packaging specs)
  • load_expansion_framework()   — reads expansion_framework.md (6-step sub-section blueprint)

Exposes master concatenator:
  • load_all_context_documents() / load_full_context_string() — reads all 8 files
    and concatenates them into one unified, comprehensive context string.

All follow the same contract: fresh filesystem read on every call,
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

_STORY_BIBLE_PATH            = _REPO_ROOT / "story_bible.md"
_SYSTEM_RULES_PATH           = _REPO_ROOT / "system_rules.md"
_BOOK_OUTLINE_PATH           = _REPO_ROOT / "book_outline.md"
_CASE_STUDIES_PATH           = _REPO_ROOT / "case_studies.md"
_AUDIENCE_PERSONAS_PATH      = _REPO_ROOT / "audience_personas.md"
_STYLISTIC_EXAMPLES_PATH     = _REPO_ROOT / "stylistic_examples.md"
_FRONT_AND_BACK_MATTER_PATH  = _REPO_ROOT / "front_and_back_matter.md"
_EXPANSION_FRAMEWORK_PATH    = _REPO_ROOT / "expansion_framework.md"


# ── Private helper ─────────────────────────────────────────────────────────────

def _load_markdown_file(target: Path, label: str) -> str:
    """
    Read *target* and return its text. On failure, return a structured
    warning string so callers never receive None.
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
    """Read story_bible.md and return it as a plain string."""
    target = Path(path) if path is not None else _STORY_BIBLE_PATH
    return _load_markdown_file(target, "Story Bible (story_bible.md)")


def load_system_rules(path: Path | str | None = None) -> str:
    """Read system_rules.md and return it as a plain string."""
    target = Path(path) if path is not None else _SYSTEM_RULES_PATH
    return _load_markdown_file(target, "System Rules (system_rules.md)")


def load_book_outline(path: Path | str | None = None) -> str:
    """Read book_outline.md and return it as a plain string."""
    target = Path(path) if path is not None else _BOOK_OUTLINE_PATH
    return _load_markdown_file(target, "Book Outline (book_outline.md)")


def load_case_studies(path: Path | str | None = None) -> str:
    """Read case_studies.md and return it as a plain string."""
    target = Path(path) if path is not None else _CASE_STUDIES_PATH
    return _load_markdown_file(target, "Case Studies (case_studies.md)")


def load_audience_personas(path: Path | str | None = None) -> str:
    """Read audience_personas.md and return it as a plain string."""
    target = Path(path) if path is not None else _AUDIENCE_PERSONAS_PATH
    return _load_markdown_file(target, "Audience Personas (audience_personas.md)")


def load_stylistic_examples(path: Path | str | None = None) -> str:
    """Read stylistic_examples.md and return it as a plain string."""
    target = Path(path) if path is not None else _STYLISTIC_EXAMPLES_PATH
    return _load_markdown_file(target, "Stylistic Examples (stylistic_examples.md)")


def load_front_and_back_matter(path: Path | str | None = None) -> str:
    """Read front_and_back_matter.md and return it as a plain string."""
    target = Path(path) if path is not None else _FRONT_AND_BACK_MATTER_PATH
    return _load_markdown_file(target, "Front & Back Matter (front_and_back_matter.md)")


def load_expansion_framework(path: Path | str | None = None) -> str:
    """Read expansion_framework.md and return it as a plain string."""
    target = Path(path) if path is not None else _EXPANSION_FRAMEWORK_PATH
    return _load_markdown_file(target, "Expansion Framework (expansion_framework.md)")


def load_all_context_documents() -> dict[str, str]:
    """
    Read all system markdown files and return them as a dictionary of filename -> content.
    """
    return {
        "story_bible.md": load_story_bible(),
        "system_rules.md": load_system_rules(),
        "book_outline.md": load_book_outline(),
        "case_studies.md": load_case_studies(),
        "audience_personas.md": load_audience_personas(),
        "stylistic_examples.md": load_stylistic_examples(),
        "front_and_back_matter.md": load_front_and_back_matter(),
        "expansion_framework.md": load_expansion_framework(),
    }


def load_full_context_string() -> str:
    """
    Read all 8 system markdown files and concatenate them into one massive,
    highly detailed context string with section dividers.
    """
    docs = load_all_context_documents()
    parts = []
    for filename, content in docs.items():
        divider = f"\n\n{'═' * 80}\n=== DOCUMENT: {filename} ===\n{'═' * 80}\n\n"
        parts.append(divider + content.strip())

    return "".join(parts)


# ── Path helpers ───────────────────────────────────────────────────────────────

def story_bible_path() -> Path:
    return _STORY_BIBLE_PATH


def system_rules_path() -> Path:
    return _SYSTEM_RULES_PATH


def book_outline_path() -> Path:
    return _BOOK_OUTLINE_PATH


def case_studies_path() -> Path:
    return _CASE_STUDIES_PATH


def audience_personas_path() -> Path:
    return _AUDIENCE_PERSONAS_PATH


def stylistic_examples_path() -> Path:
    return _STYLISTIC_EXAMPLES_PATH


def front_and_back_matter_path() -> Path:
    return _FRONT_AND_BACK_MATTER_PATH


def expansion_framework_path() -> Path:
    return _EXPANSION_FRAMEWORK_PATH

