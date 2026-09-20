"""Explainability validator per SPEC §12.

Extracts all numbers from the LLM-generated narrative and verifies that they
are a strict subset of the grounded facts. If any hallucinated or altered number
is detected, validation fails, triggering the deterministic template fallback.
"""
from __future__ import annotations

import re
from typing import Sequence
from engine.models import Why


def extract_numbers_from_text(text: str) -> set[float]:
    """Extract all integer and floating point numbers from text."""
    matches = re.findall(r"(?<![a-zA-Z_])\b\d+(?:\.\d+)?\b(?![a-zA-Z_])", text)
    numbers = set()
    for m in matches:
        try:
            val = float(m)
            numbers.add(round(val, 1))
        except ValueError:
            pass
    return numbers


def validate_narrative_numbers(
    narrative: str,
    why: Why,
) -> bool:
    """Verify that all numbers in the generated narrative match the grounded Why facts.

    Allowed numbers:
    - level (e.g. 4.0)
    - target (e.g. 7.0)
    - gap (e.g. 3.0)
    - importance (e.g. 0.85)
    - priority (e.g. 75)
    - scale number: 10 (as in 4.0/10 or 'out of 10')
    - count of unblocks (len(why.unblocks))
    """
    found_numbers = extract_numbers_from_text(narrative)
    if not found_numbers:
        return True

    allowed_numbers = {
        round(why.level, 1),
        round(why.target, 1),
        round(why.gap, 1),
        round(why.importance, 2),
        round(float(why.priority), 1),
        10.0,
        float(len(why.unblocks)),
    }

    # If importance is 0.85, 85 or 85% might also be allowed
    allowed_numbers.add(round(why.importance * 100.0, 1))

    # All found numbers must be in allowed_numbers
    for num in found_numbers:
        if num not in allowed_numbers:
            return False

    return True
