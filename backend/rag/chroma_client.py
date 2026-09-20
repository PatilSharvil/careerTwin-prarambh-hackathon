"""ChromaDB client configuration per SPEC §9.

Initializes persistent client and default ONNX MiniLM embedding function.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any
import chromadb
from chromadb.utils import embedding_functions

# Enforce single-threaded linear algebra to prevent thread pool memory explosion on multi-core hosts (e.g. Render 512MB RAM)
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")

from app.config import settings

_default_embedding_fn = None


def resolve_chroma_path(persist_path: str | Path | None = None) -> Path:
    """Resolve Chroma storage path, checking both cwd and backend/ relative directories."""
    if persist_path is not None:
        return Path(persist_path)
    cwd_path = Path(settings.CHROMA_PATH)
    if (cwd_path / ".index_hash.json").exists() or (cwd_path / "chroma.sqlite3").exists():
        return cwd_path
    backend_path = Path(__file__).resolve().parent.parent / "chroma_data"
    if (backend_path / ".index_hash.json").exists() or (backend_path / "chroma.sqlite3").exists():
        return backend_path
    return cwd_path


def _configure_onnx_download_path() -> None:
    """Ensure ONNX model downloads inside project directory so it persists across Render build->run phases."""
    try:
        from chromadb.utils.embedding_functions.onnx_mini_lm_l6_v2 import ONNXMiniLM_L6_V2
        # Check standard cache first (e.g. local dev)
        std_cache = Path(os.path.expanduser("~")) / ".cache" / "chroma" / "onnx_models" / "all-MiniLM-L6-v2"
        if (std_cache / "onnx" / "model.onnx").exists():
            return
        # In cloud environments like Render, persist inside CHROMA_PATH so it is not wiped between build and start
        chroma_dir = resolve_chroma_path()
        repo_cache = chroma_dir / "onnx_models" / "all-MiniLM-L6-v2"
        repo_cache.mkdir(parents=True, exist_ok=True)
        ONNXMiniLM_L6_V2.DOWNLOAD_PATH = str(repo_cache)
    except Exception:
        pass


def get_embedding_function() -> Any:
    """Return singleton instance of Chroma's default ONNX MiniLM embedding function."""
    global _default_embedding_fn
    if _default_embedding_fn is None:
        _configure_onnx_download_path()
        _default_embedding_fn = embedding_functions.DefaultEmbeddingFunction()
    return _default_embedding_fn


def get_chroma_client(persist_path: str | Path | None = None) -> chromadb.ClientAPI:
    """Create or return a persistent Chroma client."""
    path = resolve_chroma_path(persist_path)
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
