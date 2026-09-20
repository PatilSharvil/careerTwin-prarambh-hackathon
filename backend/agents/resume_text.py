"""PDF and plain text resume extractor per SPEC §5.3 & §10.3.

Extracts plain text using pypdf or passes raw text directly.
Raises ValueError with RESUME_PARSE_ERROR if content is unreadable or empty.
"""
from __future__ import annotations

import io
from pathlib import Path
import pypdf


class ResumeParseError(ValueError):
    """Raised when resume PDF or text cannot be parsed or is empty."""

    pass


def extract_resume_text(
    file_bytes: bytes | None = None,
    filename: str | None = None,
    raw_text: str | None = None,
) -> str:
    """Extract clean plain text from an uploaded resume PDF or raw text field."""
    if raw_text and raw_text.strip():
        return raw_text.strip()

    if file_bytes is not None and len(file_bytes) > 0:
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages_text.append(text)
            full_text = "\n".join(pages_text).strip()
            if not full_text:
                raise ResumeParseError("RESUME_PARSE_ERROR: PDF contains no readable text")
            return full_text
        except Exception as exc:
            if isinstance(exc, ResumeParseError):
                raise
            raise ResumeParseError(f"RESUME_PARSE_ERROR: Failed to parse PDF: {exc}") from exc

    raise ResumeParseError("RESUME_PARSE_ERROR: No resume text or PDF content provided")
