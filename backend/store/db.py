"""SQLite database initialization and connection management per SPEC §6.6.

Uses Python standard library sqlite3 only (zero external ORMs).
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator
from contextlib import contextmanager

from app.config import settings


def get_db_path(custom_path: str | Path | None = None) -> Path:
    """Resolve database path from argument or settings."""
    if custom_path is not None:
        return Path(custom_path)
    return Path(settings.DATABASE_PATH)


def init_db(db_path: str | Path | None = None) -> None:
    """Initialize database schema with required tables and seed default user."""
    path = get_db_path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(path)
    try:
        cursor = conn.cursor()

        # 1. users table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL
            )
            """
        )

        # 2. profiles table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS profiles (
                user_id TEXT PRIMARY KEY,
                json TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )

        # 3. roadmaps table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS roadmaps (
                user_id TEXT NOT NULL,
                version INTEGER NOT NULL,
                json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (user_id, version),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )

        # 4. progress_events table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS progress_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                ts TEXT NOT NULL,
                type TEXT NOT NULL,
                payload TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )

        # 5. role_versions table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS role_versions (
                role_id TEXT NOT NULL,
                version TEXT NOT NULL,
                json TEXT NOT NULL,
                is_custom INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (role_id, version)
            )
            """
        )

        # 6. llm_cache table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS llm_cache (
                key TEXT PRIMARY KEY,
                json TEXT NOT NULL,
                ts TEXT NOT NULL
            )
            """
        )

        # Seed default user
        default_user = settings.DEFAULT_USER_ID
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute(
            "INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)",
            (default_user, now),
        )
        conn.commit()
    finally:
        conn.close()


@contextmanager
def get_connection(db_path: str | Path | None = None) -> Generator[sqlite3.Connection, None, None]:
    """Provide a transactional scope around database operations."""
    path = get_db_path(db_path)
    if not path.exists():
        init_db(path)

    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
