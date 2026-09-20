"""Knowledge base indexing into ChromaDB per SPEC §9.

Indexes skills (collection 'skills') and resources (collection 'resources').
Important implementation rule per SPEC §9:
Chroma metadata cannot hold lists, so 'resources' is indexed as ONE RECORD PER
(resource, skill) PAIR with metadata: resource_id, skill_id, type, level_from, level_to.
"""
from __future__ import annotations

import gc
import hashlib
import json
import logging
from pathlib import Path
from typing import Any

from app.config import settings
from rag.chroma_client import get_chroma_client, get_or_create_collection

logger = logging.getLogger("careertwin.rag.indexer")


def _compute_data_hash(skills_path: Path, resources_path: Path, roles_path: Path | None = None) -> str:
    """Compute combined SHA-256 hash of skills.json, resources.json, and roles.json."""
    hasher = hashlib.sha256()
    if skills_path.exists():
        hasher.update(skills_path.read_bytes())
    if resources_path.exists():
        hasher.update(resources_path.read_bytes())
    if roles_path is not None and roles_path.exists():
        hasher.update(roles_path.read_bytes())
    return hasher.hexdigest()


def index_knowledge_base(
    data_dir: Path | str | None = None,
    chroma_path: Path | str | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """Index skills and resources into ChromaDB idempotently.

    Skips indexing if the combined hash of skills.json and resources.json is unchanged,
    unless force=True.
    """
    if data_dir is None:
        data_path = Path(__file__).resolve().parent.parent / "data"
    else:
        data_path = Path(data_dir)

    skills_file = data_path / "skills.json"
    resources_file = data_path / "resources.json"
    roles_file = data_path / "roles.json"

    if not skills_file.exists() or not resources_file.exists():
        raise FileNotFoundError(f"Missing data files in {data_path}")

    current_hash = _compute_data_hash(skills_file, resources_file, roles_file)

    client = get_chroma_client(chroma_path)
    chroma_dir = Path(chroma_path) if chroma_path is not None else Path(settings.CHROMA_PATH)
    chroma_dir.mkdir(parents=True, exist_ok=True)
    hash_file = chroma_dir / ".index_hash.json"

    if not force and hash_file.exists():
        try:
            saved_hash_data = json.loads(hash_file.read_text(encoding="utf-8"))
            if saved_hash_data.get("hash") == current_hash:
                logger.info("Chroma index is up to date (hash=%s). Skipping.", current_hash[:8])
                return {"status": "skipped", "hash": current_hash}
        except Exception:
            pass

    # Load data
    with open(skills_file, "r", encoding="utf-8") as f:
        skills_data = json.load(f)

    with open(resources_file, "r", encoding="utf-8") as f:
        resources_data = json.load(f)

    # 1. Index Skills: One record per skill
    skills_col = get_or_create_collection("skills", client=client)
    skill_ids: list[str] = []
    skill_docs: list[str] = []
    skill_metas: list[dict[str, Any]] = []

    for s in skills_data:
        sid = s["id"]
        aliases_str = ", ".join(s.get("aliases", []))
        tags_str = ", ".join(s.get("tags", []))
        doc = f"{s['name']} (aliases: {aliases_str}). Category: {s.get('category', '')}. Tags: {tags_str}."

        skill_ids.append(sid)
        skill_docs.append(doc)
        skill_metas.append(
            {
                "skill_id": sid,
                "name": s["name"],
                "category": s.get("category", ""),
            }
        )

    BATCH_SIZE = 20

    if skill_ids:
        for i in range(0, len(skill_ids), BATCH_SIZE):
            skills_col.upsert(
                ids=skill_ids[i : i + BATCH_SIZE],
                documents=skill_docs[i : i + BATCH_SIZE],
                metadatas=skill_metas[i : i + BATCH_SIZE],
            )
            gc.collect()

    # 2. Index Resources: ONE RECORD PER (resource, skill) PAIR
    res_col = get_or_create_collection("resources", client=client)
    res_ids: list[str] = []
    res_docs: list[str] = []
    res_metas: list[dict[str, Any]] = []

    for r in resources_data:
        rid = r["id"]
        title = r.get("title", "")
        desc = r.get("description", "")
        rtype = r.get("type", "course")
        lvl_from = float(r.get("level_from", 0))
        lvl_to = float(r.get("level_to", 10))
        skills_covered = r.get("skills", [])

        for sk in skills_covered:
            doc = f"{title}. {desc} Type: {rtype}. Skill: {sk}."
            pair_id = f"{rid}__{sk}"

            res_ids.append(pair_id)
            res_docs.append(doc)
            res_metas.append(
                {
                    "resource_id": rid,
                    "skill_id": sk,
                    "type": rtype,
                    "level_from": lvl_from,
                    "level_to": lvl_to,
                }
            )

    if res_ids:
        for i in range(0, len(res_ids), BATCH_SIZE):
            res_col.upsert(
                ids=res_ids[i : i + BATCH_SIZE],
                documents=res_docs[i : i + BATCH_SIZE],
                metadatas=res_metas[i : i + BATCH_SIZE],
            )
            gc.collect()

    # 3. Index Roles: One record per role
    role_ids: list[str] = []
    if roles_file.exists():
        with open(roles_file, "r", encoding="utf-8") as f:
            roles_data = json.load(f)
        roles_col = get_or_create_collection("roles", client=client)
        role_docs: list[str] = []
        role_metas: list[dict[str, Any]] = []

        for r in roles_data:
            rid = r["role_id"]
            title = r.get("title", "")
            desc = r.get("description", "")
            doc = f"{title}. {desc}"
            role_ids.append(rid)
            role_docs.append(doc)
            role_metas.append({"role_id": rid, "title": title})

        if role_ids:
            for i in range(0, len(role_ids), BATCH_SIZE):
                roles_col.upsert(
                    ids=role_ids[i : i + BATCH_SIZE],
                    documents=role_docs[i : i + BATCH_SIZE],
                    metadatas=role_metas[i : i + BATCH_SIZE],
                )
                gc.collect()

    # Save hash
    hash_file.write_text(json.dumps({"hash": current_hash}), encoding="utf-8")
    logger.info(
        "Successfully indexed %d skills, %d (resource, skill) pairs, and %d roles into Chroma.",
        len(skill_ids),
        len(res_ids),
        len(role_ids),
    )

    return {
        "status": "indexed",
        "skills_count": len(skill_ids),
        "resources_pairs_count": len(res_ids),
        "roles_count": len(role_ids),
        "hash": current_hash,
    }
