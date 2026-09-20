"""Navigator root agent module per SPEC §5.2, §8, and §13.3.

Exports root_agent so that `adk web` and `adk eval` can evaluate the Coach agent.
"""
from __future__ import annotations

import sys
from pathlib import Path

_backend_root = str(Path(__file__).resolve().parent.parent.parent)
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from agents.coach_agent import build_coach_agent
from app.config import settings
from llm.provider import available_chain, get_model

# Build root_agent with the primary available provider or fallback to Gemini
chain = available_chain()
provider = chain[0] if chain else "gemini"
model = get_model(provider)

root_agent = build_coach_agent(model)
