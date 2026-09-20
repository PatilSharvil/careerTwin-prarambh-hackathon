"""Multi-provider failover execution per SPEC §3.1 & §5.3.

Provides resilient execution across the provider fallback chain (Gemini -> Groq -> OpenRouter)
with retry, timeout management, error logging, and failover guarantees.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from typing import Callable, Sequence, TypeVar

from app.config import settings
from llm.provider import available_chain

logger = logging.getLogger("careertwin.llm.failover")

T = TypeVar("T")


class AllProvidersFailed(Exception):
    """Raised when all configured LLM providers in the fallback chain have failed."""

    pass


def run_with_failover(
    step_name: str,
    make_call: Callable[[str], T],
    chain: Sequence[str] | None = None,
    timeout_seconds: float | None = None,
) -> tuple[T, str]:
    """Execute make_call(provider) across the provider chain with retries and failover.

    Returns:
        (result, successful_provider)

    Raises:
        AllProvidersFailed: If all providers in the chain fail or if the chain is empty.
    """
    providers = list(chain) if chain is not None else available_chain()

    # Filter out 'none'
    active_providers = [p for p in providers if p.lower() != "none"]

    if not active_providers:
        logger.warning("No LLM providers available for step '%s'", step_name)
        raise AllProvidersFailed(f"No LLM providers available for step '{step_name}'")

    timeout = timeout_seconds if timeout_seconds is not None else float(settings.LLM_TIMEOUT_SECONDS)
    last_error: Exception | None = None

    for provider in active_providers:
        for attempt in range(1, 3):  # 1 initial try + 1 retry = max 2 attempts
            print(f"\n[LLM CALL] Step: '{step_name}' | Provider: '{provider}' | Attempt: {attempt}/2", flush=True)
            logger.info("Calling LLM step='%s' provider='%s' attempt=%d", step_name, provider, attempt)
            try:
                # Execute with timeout via ThreadPoolExecutor
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(make_call, provider)
                    result = future.result(timeout=timeout)

                print(f"[LLM SUCCESS] Step: '{step_name}' | Provider: '{provider}'\n", flush=True)
                logger.info("LLM call succeeded step='%s' provider='%s'", step_name, provider)
                return result, provider

            except FutureTimeoutError as exc:
                last_error = exc
                print(f"[LLM TIMEOUT] Step: '{step_name}' | Provider: '{provider}' timed out after {timeout}s", flush=True)
                logger.warning(
                    "LLM call timed out after %.1fs step='%s' provider='%s' attempt=%d",
                    timeout,
                    step_name,
                    provider,
                    attempt,
                )
            except Exception as exc:
                last_error = exc
                print(f"[LLM ERROR] Step: '{step_name}' | Provider: '{provider}' attempt={attempt} failed: {exc}", flush=True)
                logger.warning(
                    "LLM call failed step='%s' provider='%s' attempt=%d error=%s",
                    step_name,
                    provider,
                    attempt,
                    exc,
                )

    print(f"\n[LLM ALL FAILED] All providers failed for step: '{step_name}'. Last error: {last_error}\n", flush=True)
    raise AllProvidersFailed(
        f"All LLM providers failed for step '{step_name}'. Last error: {last_error}"
    ) from last_error
