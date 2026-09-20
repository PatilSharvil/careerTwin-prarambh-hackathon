"""Repository methods for profiles, roadmaps, progress events, roles, and cache.

Pure Python sqlite3 operations without an ORM.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from store.db import get_connection


def get_profile(user_id: str, db_path: str | Path | None = None) -> dict[str, Any] | None:
    """Retrieve user profile JSON by user_id."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT json FROM profiles WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["json"])
        return None


def save_profile(user_id: str, profile_dict: dict[str, Any], db_path: str | Path | None = None) -> None:
    """Insert or update user profile JSON."""
    now = datetime.now(timezone.utc).isoformat()
    json_str = json.dumps(profile_dict)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        # Ensure user exists
        cursor.execute("INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)", (user_id, now))
        cursor.execute(
            """
            INSERT INTO profiles (user_id, json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                json = excluded.json,
                updated_at = excluded.updated_at
            """,
            (user_id, json_str, now),
        )


def save_roadmap(
    user_id: str,
    version: int,
    roadmap_dict: dict[str, Any],
    db_path: str | Path | None = None,
) -> None:
    """Save an immutable roadmap version for the given user."""
    now = datetime.now(timezone.utc).isoformat()
    json_str = json.dumps(roadmap_dict)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)", (user_id, now))
        cursor.execute(
            """
            INSERT INTO roadmaps (user_id, version, json, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, version) DO UPDATE SET
                json = excluded.json,
                created_at = excluded.created_at
            """,
            (user_id, version, json_str, now),
        )


def get_latest_roadmap(user_id: str, db_path: str | Path | None = None) -> tuple[int | None, dict[str, Any] | None]:
    """Retrieve the highest version roadmap for the user."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT version, json FROM roadmaps WHERE user_id = ? ORDER BY version DESC LIMIT 1",
            (user_id,),
        )
        row = cursor.fetchone()
        if row:
            return row["version"], json.loads(row["json"])
        return None, None


def get_roadmap_version(
    user_id: str,
    version: int,
    db_path: str | Path | None = None,
) -> dict[str, Any] | None:
    """Retrieve a specific version of the roadmap for the user."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT json FROM roadmaps WHERE user_id = ? AND version = ?",
            (user_id, version),
        )
        row = cursor.fetchone()
        if row:
            return json.loads(row["json"])
        return None


def append_event(
    user_id: str,
    event_type: str,
    payload: dict[str, Any],
    db_path: str | Path | None = None,
) -> None:
    """Append a user progress/audit event."""
    now = datetime.now(timezone.utc).isoformat()
    payload_str = json.dumps(payload)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)", (user_id, now))
        cursor.execute(
            """
            INSERT INTO progress_events (user_id, ts, type, payload)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, now, event_type, payload_str),
        )


def get_events(user_id: str, db_path: str | Path | None = None) -> list[dict[str, Any]]:
    """Retrieve all progress events for the user ordered by ID ascending."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, ts, type, payload FROM progress_events WHERE user_id = ? ORDER BY id ASC",
            (user_id,),
        )
        rows = cursor.fetchall()
        events = []
        for r in rows:
            events.append(
                {
                    "id": r["id"],
                    "user_id": r["user_id"],
                    "ts": r["ts"],
                    "type": r["type"],
                    "payload": json.loads(r["payload"]),
                }
            )
        return events


def save_role_version(
    role_id: str,
    version: str,
    role_dict: dict[str, Any],
    is_custom: bool = False,
    db_path: str | Path | None = None,
) -> None:
    """Save a role definition version (standard or custom)."""
    json_str = json.dumps(role_dict)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO role_versions (role_id, version, json, is_custom)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(role_id, version) DO UPDATE SET
                json = excluded.json,
                is_custom = excluded.is_custom
            """,
            (role_id, version, json_str, 1 if is_custom else 0),
        )


def get_role_version(
    role_id: str,
    version: str,
    db_path: str | Path | None = None,
) -> dict[str, Any] | None:
    """Retrieve a specific role version."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT json FROM role_versions WHERE role_id = ? AND version = ?",
            (role_id, version),
        )
        row = cursor.fetchone()
        if row:
            return json.loads(row["json"])
        return None


def list_role_versions(role_id: str, db_path: str | Path | None = None) -> list[dict[str, Any]]:
    """List all stored versions for a role."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT version, json, is_custom FROM role_versions WHERE role_id = ? ORDER BY version ASC",
            (role_id,),
        )
        rows = cursor.fetchall()
        return [
            {
                "version": r["version"],
                "role": json.loads(r["json"]),
                "is_custom": bool(r["is_custom"]),
            }
            for r in rows
        ]


def get_custom_roles(db_path: str | Path | None = None) -> list[dict[str, Any]]:
    """Retrieve all saved custom roles."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT json FROM role_versions WHERE is_custom = 1")
        rows = cursor.fetchall()
        return [json.loads(r["json"]) for r in rows]


def cache_get(key: str, db_path: str | Path | None = None) -> dict[str, Any] | None:
    """Retrieve cached LLM output by hash key."""
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT json FROM llm_cache WHERE key = ?", (key,))
        row = cursor.fetchone()
        if row:
            return json.loads(row["json"])
        return None


def cache_set(key: str, data: dict[str, Any], db_path: str | Path | None = None) -> None:
    """Cache LLM output JSON."""
    now = datetime.now(timezone.utc).isoformat()
    json_str = json.dumps(data)
    with get_connection(db_path) as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO llm_cache (key, json, ts)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                json = excluded.json,
                ts = excluded.ts
            """,
            (key, json_str, now),
        )
