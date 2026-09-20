"""Storage package for CareerTwin SQLite persistence."""
from store.db import get_connection, init_db
from store.repo import (
    append_event,
    cache_get,
    cache_set,
    get_events,
    get_latest_roadmap,
    get_profile,
    get_roadmap_version,
    get_role_version,
    list_role_versions,
    save_profile,
    save_roadmap,
    save_role_version,
)

__all__ = [
    "init_db",
    "get_connection",
    "get_profile",
    "save_profile",
    "save_roadmap",
    "get_latest_roadmap",
    "get_roadmap_version",
    "append_event",
    "get_events",
    "save_role_version",
    "get_role_version",
    "list_role_versions",
    "cache_get",
    "cache_set",
]
