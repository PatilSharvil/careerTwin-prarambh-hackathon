"""Provider factory and configuration per SPEC §3.1 & §8.

Returns appropriate model strings or LiteLlm instances for Gemini, Groq, and OpenRouter.
"""
from __future__ import annotations

from typing import Any
from app.config import settings

try:
    from google.adk.models.lite_llm import LiteLlm
except ImportError:
    LiteLlm = None  # type: ignore[assignment,misc]


def get_model(provider: str) -> Any:
    """Return model specification for the specified provider."""
    prov = provider.lower().strip()
    if prov == "gemini":
        return settings.GEMINI_MODEL
    elif prov == "groq":
        if LiteLlm is None:
            raise RuntimeError("google-adk LiteLlm is not installed")
        return LiteLlm(model=f"groq/{settings.GROQ_MODEL}")
    elif prov == "openrouter":
        if LiteLlm is None:
            raise RuntimeError("google-adk LiteLlm is not installed")
        return LiteLlm(model=f"openrouter/{settings.OPENROUTER_MODEL}")
    else:
        raise ValueError(f"Unknown LLM provider: {provider}")


def available_chain() -> list[str]:
    """Return ordered list of providers that have valid API keys configured.

    If settings.LLM_PROVIDER_CHAIN contains 'none', returns an empty list.
    """
    raw_chain = [p.strip().lower() for p in settings.LLM_PROVIDER_CHAIN.split(",") if p.strip()]
    if "none" in raw_chain or not raw_chain:
        return []

    available: list[str] = []
    for p in raw_chain:
        if p == "gemini" and settings.GEMINI_API_KEY.strip():
            available.append("gemini")
        elif p == "groq" and settings.GROQ_API_KEY.strip():
            available.append("groq")
        elif p == "openrouter" and settings.OPENROUTER_API_KEY.strip():
            available.append("openrouter")

    return available
