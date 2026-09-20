"""Tests for multi-provider LLM failover and tolerant parsing."""
from __future__ import annotations

import pytest
from pydantic import BaseModel

from llm.failover import AllProvidersFailed, run_with_failover
from llm.parsing import extract_json_str, parse_and_validate, parse_json


class DummyOutput(BaseModel):
    name: str
    level: float


# =====================================================================
# 1. Parsing Tests
# =====================================================================
def test_parse_clean_json():
    text = '{"name": "Python", "level": 8.0}'
    res = parse_and_validate(text, DummyOutput)
    assert res.name == "Python"
    assert res.level == 8.0


def test_parse_fenced_json():
    text = """```json
    {
        "name": "Docker",
        "level": 6.5
    }
    ```"""
    res = parse_and_validate(text, DummyOutput)
    assert res.name == "Docker"
    assert res.level == 6.5


def test_parse_prose_wrapped_json():
    text = """Certainly! Here is the JSON response you requested:
    {
        "name": "FastAPI",
        "level": 7.0
    }
    Let me know if you need anything else!"""
    res = parse_and_validate(text, DummyOutput)
    assert res.name == "FastAPI"
    assert res.level == 7.0


def test_parse_invalid_json_raises_value_error():
    text = "This is not JSON at all."
    with pytest.raises(ValueError, match="Failed to decode JSON"):
        parse_json(text)


def test_validation_error_on_missing_field():
    text = '{"name": "Incomplete"}'
    with pytest.raises(ValueError, match="Validation error"):
        parse_and_validate(text, DummyOutput)


# =====================================================================
# 2. Failover Tests
# =====================================================================
def test_failover_succeeds_on_third_provider():
    """Providers 1 and 2 fail; provider 3 succeeds -> 3rd provider returned."""
    call_log: list[str] = []

    def fake_make_call(provider: str) -> dict:
        call_log.append(provider)
        if provider == "gemini":
            raise RuntimeError("Gemini 429 Quota Exceeded")
        elif provider == "groq":
            raise ConnectionError("Groq 503 Service Unavailable")
        elif provider == "openrouter":
            return {"status": "ok", "provider": "openrouter"}
        raise ValueError(f"Unknown provider {provider}")

    result, successful_provider = run_with_failover(
        step_name="profile_extraction",
        make_call=fake_make_call,
        chain=["gemini", "groq", "openrouter"],
        timeout_seconds=2.0,
    )

    assert result["status"] == "ok"
    assert successful_provider == "openrouter"
    # Verify retry behavior: gemini tried twice, groq tried twice, openrouter succeeded on attempt 1
    assert call_log == ["gemini", "gemini", "groq", "groq", "openrouter"]


def test_failover_all_providers_fail():
    """All providers fail -> raises AllProvidersFailed."""
    def fake_make_call(provider: str) -> dict:
        raise RuntimeError(f"Provider {provider} down")

    with pytest.raises(AllProvidersFailed, match="All LLM providers failed"):
        run_with_failover(
            step_name="test_step",
            make_call=fake_make_call,
            chain=["gemini", "groq"],
            timeout_seconds=1.0,
        )


def test_failover_chain_none_or_empty():
    """Empty chain or 'none' raises AllProvidersFailed immediately without calling anything."""
    call_count = 0

    def fake_make_call(provider: str) -> dict:
        nonlocal call_count
        call_count += 1
        return {}

    with pytest.raises(AllProvidersFailed, match="No LLM providers available"):
        run_with_failover(
            step_name="test_step",
            make_call=fake_make_call,
            chain=["none"],
        )
    assert call_count == 0

    with pytest.raises(AllProvidersFailed, match="No LLM providers available"):
        run_with_failover(
            step_name="test_step",
            make_call=fake_make_call,
            chain=[],
        )
    assert call_count == 0
