"""ChromaDB client configuration per SPEC §9.

Initializes persistent client and default ONNX MiniLM embedding function.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any
import chromadb
from chromadb.utils import embedding_functions

from app.config import settings

_default_embedding_fn = None


def get_embedding_function() -> Any:
    """Return singleton instance of Chroma's default ONNX MiniLM embedding function."""
    global _default_embedding_fn
    if _default_embedding_fn is None:
        _default_embedding_fn = embedding_functions.DefaultEmbeddingFunction()
    return _default_embedding_fn


def get_chroma_client(persist_path: str | Path | None = None) -> chromadb.ClientAPI:
    """Create or return a persistent Chroma client."""
    path = Path(persist_path) if persist_path is not None else Path(settings.CHROMA_PATH)
    path.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(path))


def get_or_create_collection(
    name: str,
    client: chromadb.ClientAPI | None = None,
) -> Any:
    """Get or create collection using the default embedding function and cosine space."""
    c = client or get_chroma_client()
    return c.get_or_create_collection(
        name=name,
        embedding_function=get_embedding_function(),
        metadata={"hnsw:space": "cosine"},
    )
