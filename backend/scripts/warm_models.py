"""Model warming and offline Chroma index pre-population per SPEC §9.

Initializes the default ONNX MiniLM embedding function and builds the vector
index for skills and resources in ./chroma_data.
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from rag.chroma_client import get_embedding_function
from rag.indexer import index_knowledge_base


def main() -> None:
    print("=" * 60)
    print("WARMING CHROMADB EMBEDDING MODELS AND BUILDING INDEX")
    print("=" * 60)

    t0 = time.time()
    print("1. Initializing ONNX MiniLM embedding function...")
    embedding_fn = get_embedding_function()
    # Run test embedding
    test_vec = embedding_fn(["CareerTwin skill normalization test"])[0]
    print(f"   Embedding model warmed successfully! Vector dimension: {len(test_vec)}")

    print("2. Indexing skills and resources into ChromaDB...")
    result = index_knowledge_base(force=True)
    elapsed = time.time() - t0

    print(f"   Status: {result.get('status')}")
    print(f"   Skills indexed: {result.get('skills_count')}")
    print(f"   Resource pairs indexed: {result.get('resources_pairs_count')}")
    print(f"   Index hash: {result.get('hash')[:12]}...")
    print(f"Index warming completed in {elapsed:.2f}s.")
    print("=" * 60)


if __name__ == "__main__":
    main()
