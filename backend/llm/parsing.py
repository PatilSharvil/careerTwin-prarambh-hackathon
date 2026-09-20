"""Tolerant JSON extraction and Pydantic validation for LLM responses.

Strips code fences, extracts embedded JSON objects or arrays from surrounding
prose, and validates against Pydantic models with actionable errors.
"""
from __future__ import annotations

import json
import re
from typing import Any, TypeVar
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


def extract_json_str(text: str) -> str:
    """Extract raw JSON string from markdown code blocks or surrounding prose."""
    cleaned = text.strip()

    # 1. Match code fences: ```json ... ``` or ``` ... ```
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()

    # 2. Look for outer JSON object {...} or array [...]
    first_brace = cleaned.find("{")
    first_bracket = cleaned.find("[")

    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        last_brace = cleaned.rfind("}")
        if last_brace > first_brace:
            return cleaned[first_brace : last_brace + 1].strip()

    if first_bracket != -1:
        last_bracket = cleaned.rfind("]")
        if last_bracket > first_bracket:
            return cleaned[first_bracket : last_bracket + 1].strip()

    return cleaned


def parse_json(text: str) -> Any:
    """Extract and parse JSON from text, raising ValueError on syntax failure."""
    raw_json = extract_json_str(text)
    try:
        return json.loads(raw_json)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Failed to decode JSON from LLM response: {exc.msg} at pos {exc.pos}. Raw string: {raw_json[:200]!r}"
        ) from exc


def parse_and_validate(text: str, model_cls: type[T]) -> T:
    """Parse JSON and validate against the provided Pydantic model class."""
    data = parse_json(text)
    if isinstance(data, list):
        fields = getattr(model_cls, "model_fields", {})
        if "explanations" in fields:
            data = {"explanations": data}
        elif len(fields) == 1:
            field_name = next(iter(fields))
            data = {field_name: data}
    try:
        return model_cls.model_validate(data)
    except ValidationError as exc:
        raise ValueError(
            f"Validation error for {model_cls.__name__}: {exc.error_count()} errors encountered: {exc}"
        ) from exc
