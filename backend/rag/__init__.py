"""ChromaDB indexing, normalization, and retrieval package."""
from rag.chroma_client import get_chroma_client, get_embedding_function, get_or_create_collection
from rag.indexer import index_knowledge_base
from rag.normalizer import SkillNormalizer, normalize
from rag.retriever import ChromaResourceProvider

__all__ = [
    "get_chroma_client",
    "get_embedding_function",
    "get_or_create_collection",
    "index_knowledge_base",
    "SkillNormalizer",
    "normalize",
    "ChromaResourceProvider",
]
