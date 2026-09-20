"""Smoke test for configured LLM providers in provider chain per SPEC §3.1.

Iterates over providers returned by available_chain().
For each provider: makes one tiny JSON-mode call and prints OK/FAIL + latency.
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.config import settings
from llm.parsing import parse_json
from llm.provider import available_chain

try:
    import litellm
    litellm.suppress_debug_info = True
except ImportError:
    litellm = None


def test_provider(provider: str) -> tuple[bool, float, str]:
    """Test a single LLM provider with a small JSON-mode prompt."""
    if litellm is None:
        return False, 0.0, "litellm package not installed"

    # Map provider to litellm model name
    if provider == "gemini":
        model_name = f"gemini/{settings.GEMINI_MODEL}"
        api_key = settings.GEMINI_API_KEY
    elif provider == "groq":
        model_name = f"groq/{settings.GROQ_MODEL}"
        api_key = settings.GROQ_API_KEY
    elif provider == "openrouter":
        model_name = f"openrouter/{settings.OPENROUTER_MODEL}"
        api_key = settings.OPENROUTER_API_KEY
    else:
        return False, 0.0, f"Unsupported provider: {provider}"

    messages = [
        {"role": "system", "content": "You are a JSON generator. Always output valid JSON only."},
        {"role": "user", "content": 'Return a JSON object with {"status": "ok", "provider": "' + provider + '"}'},
    ]

    t0 = time.time()
    try:
        response = litellm.completion(
            model=model_name,
            messages=messages,
            api_key=api_key,
            response_format={"type": "json_object"},
            timeout=15,
        )
        latency = time.time() - t0
        content = response.choices[0].message.content
        data = parse_json(content)
        if isinstance(data, dict) and data.get("status") == "ok":
            return True, latency, json.dumps(data)
        return True, latency, f"Returned: {content[:80]}"
    except Exception as exc:
        latency = time.time() - t0
        return False, latency, str(exc)


def main() -> None:
    print("=" * 60)
    print("CAREERTWIN LLM PROVIDER SMOKE TEST")
    print("=" * 60)

    chain = available_chain()
    print(f"Configured provider chain setting : {settings.LLM_PROVIDER_CHAIN}")
    print(f"Available providers with API keys: {chain or 'None (dry run)'}")
    print("-" * 60)

    if not chain:
        print("NOTE: No LLM provider API keys found in environment or .env.")
        print("To enable live calls, provide GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY.")
        print("All automated tests run offline with mock providers.")
        print("=" * 60)
        return

    all_passed = True
    for prov in chain:
        print(f"Testing provider '{prov}'... ", end="", flush=True)
        ok, latency, msg = test_provider(prov)
        if ok:
            print(f"OK ({latency:.2f}s) - {msg}")
        else:
            all_passed = False
            print(f"FAIL ({latency:.2f}s) - {msg}")

    print("=" * 60)
    if not all_passed:
        sys.exit(1)


if __name__ == "__main__":
    main()
