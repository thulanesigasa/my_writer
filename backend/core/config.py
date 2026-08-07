"""
config.py — Application Settings via Pydantic-Settings
=======================================================
All secrets and tunables are loaded from environment variables (or a .env file).
Never hard-code credentials here — add them to .env and load via this module.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── OpenAI ────────────────────────────────────────────────────────────────
    openai_api_key: str = Field(..., description="OpenAI API key")
    openai_org_id: str = Field("", description="Optional OpenAI org ID")

    # ── Model routing ─────────────────────────────────────────────────────────
    fast_model: str = Field("gpt-4o-mini", description="Cheap model for routing/summarisation")
    creative_model: str = Field("gpt-4o", description="High-tier model for prose drafting")
    fast_model_temperature: float = 0.2
    creative_model_temperature: float = 0.85
    max_tokens_per_segment: int = 1200      # prose tokens per LLM call
    context_window_limit: int = 128_000

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = Field("redis://localhost:6379", description="Redis connection URL")
    redis_checkpoint_ttl_seconds: int = 60 * 60 * 24 * 7  # 7 days

    # ── FastAPI ───────────────────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_reload: bool = True
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # ── Book generation ───────────────────────────────────────────────────────
    target_words_per_chapter: int = 2000
    max_draft_retries: int = 3
    recent_summaries_in_context: int = 3    # rolling window of chapter summaries


# Singleton instance — import this in all modules
settings = Settings()
