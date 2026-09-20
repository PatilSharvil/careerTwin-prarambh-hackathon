"""Tolerant JSON extraction and Pydantic validation for LLM responses.

Strips code fences, extracts embedded JSON objects or arrays from surrounding
prose, prints raw responses to terminal stdout for visibility, and validates
against Pydantic models with tolerant structure mapping.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any, TypeVar
from pydantic import BaseModel, ValidationError

logger = logging.getLogger("careertwin.llm.parsing")
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
    """Parse JSON and validate against the provided Pydantic model class with tolerant wrappers."""
    # Terminal logging of raw LLM response as requested by user
    print(
        f"\n==================== [LLM RAW RESPONSE -> {model_cls.__name__}] ====================\n"
        f"{text.strip()}\n"
        f"====================================================================================\n",
        flush=True,
    )
    logger.info("LLM response for %s:\n%s", model_cls.__name__, text.strip())

    # 1. If LLM returned a bare JSON list, wrap into the model's primary list field
    if isinstance(data, list):
        if "skills" in model_cls.model_fields:
            data = {"skills": data}
        elif "explanations" in model_cls.model_fields:
            data = {"explanations": data}
        else:
            target_field = None
            for f_name, f_info in model_cls.model_fields.items():
                ann = getattr(f_info, "annotation", None)
                origin = getattr(ann, "__origin__", None)
                if origin is list or ann is list:
                    target_field = f_name
                    break
            if target_field:
                data = {target_field: data}

    # 2. If LLM returned a dict with non-standard wrapper keys
    if isinstance(data, dict):
        # ExplanationsOut wrapper normalization
        if "explanations" in model_cls.model_fields and "explanations" not in data:
            for alt in ("items", "results", "data", "list", "output"):
                if alt in data and isinstance(data[alt], list):
                    data["explanations"] = data[alt]
                    break

        # ProfileOut wrapper normalization
        if "skills" in model_cls.model_fields and "skills" not in data:
            for alt in ("extracted_skills", "skills_list", "technical_skills", "data", "items"):
                if alt in data and isinstance(data[alt], list):
                    data["skills"] = data[alt]
                    break
    try:
        return model_cls.model_validate(data)
    except ValidationError as exc:
        raise ValueError(
            f"Validation error for {model_cls.__name__}: {exc.error_count()} errors encountered: {exc}"
        ) from exc
