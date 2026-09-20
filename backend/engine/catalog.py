"""Catalog loader and DAG utilities for skills and roles.

Pure Python logic:
- Loads skills.json and roles.json from data directory.
- Computes direct dependents, transitive prerequisite closure, and topological sorting.
"""
from __future__ import annotations

import json
from collections import defaultdict, deque
from pathlib import Path
from typing import Iterable, Sequence
from engine.models import Role, RoleSkill, Skill


class Catalog:
    """In-memory knowledge base of skills, roles, and DAG relationships."""

    def __init__(
        self,
        skills: Sequence[Skill] | None = None,
        roles: Sequence[Role] | None = None,
    ) -> None:
        self.skills: list[Skill] = list(skills or [])
        self.roles: list[Role] = list(roles or [])

        self._skills_by_id: dict[str, Skill] = {s.id: s for s in self.skills}
        self._roles_by_id: dict[str, Role] = {r.role_id: r for r in self.roles}

        # Build dependents index: skill_id -> list of skill_ids that have skill_id as prereq
        self._dependents: dict[str, list[str]] = defaultdict(list)
        for s in self.skills:
            for req in s.prerequisites:
                self._dependents[req.skill].append(s.id)

    @classmethod
    def from_data_dir(cls, data_dir: Path | str | None = None) -> Catalog:
        """Load catalog from JSON files in the specified directory."""
        if data_dir is None:
            # Default to backend/data relative to this file
            data_path = Path(__file__).resolve().parent.parent / "data"
        else:
            data_path = Path(data_dir)

        skills_file = data_path / "skills.json"
        roles_file = data_path / "roles.json"

        skills: list[Skill] = []
        if skills_file.exists():
            with open(skills_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                skills = [Skill.model_validate(item) for item in data]

        roles: list[Role] = []
        if roles_file.exists():
            with open(roles_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                roles = [Role.model_validate(item) for item in data]

        return cls(skills=skills, roles=roles)

    def get_skill(self, skill_id: str) -> Skill | None:
        """Retrieve skill definition by id."""
        return self._skills_by_id.get(skill_id)

    def get_role(self, role_id: str) -> Role | None:
        """Retrieve role definition by id."""
        return self._roles_by_id.get(role_id)

    def dependents(self, skill_id: str) -> list[str]:
        """Return all skill IDs that directly require skill_id as a prerequisite."""
        return list(self._dependents.get(skill_id, []))

    def role_dependents(self, skill_id: str, role: Role | set[str] | list[str]) -> list[str]:
        """Return direct dependents of skill_id that belong to the specified role."""
        if isinstance(role, Role):
            role_ids = {rs.skill for rs in role.skills}
        else:
            role_ids = set(role)

        return [dep for dep in self.dependents(skill_id) if dep in role_ids]

    def prerequisite_closure(self, skill_ids: Iterable[str]) -> set[str]:
        """Return the transitive closure of all prerequisites for the given skill IDs."""
        closure: set[str] = set()
        queue: deque[str] = deque(skill_ids)

        while queue:
            curr = queue.popleft()
            skill = self.get_skill(curr)
            if not skill:
                continue
            for req in skill.prerequisites:
                if req.skill not in closure:
                    closure.add(req.skill)
                    queue.append(req.skill)

        return closure

    def topological_sort(self, skill_ids: Iterable[str] | None = None) -> list[str]:
        """Topologically sort the provided skills (or all skills in catalog) using Kahn's algorithm."""
        subset: set[str] = set(skill_ids) if skill_ids is not None else set(self._skills_by_id.keys())

        # In-degree within the subset
        in_degree: dict[str, int] = {sid: 0 for sid in subset}
        adj: dict[str, list[str]] = defaultdict(list)

        for sid in subset:
            sk = self.get_skill(sid)
            if not sk:
                continue
            for req in sk.prerequisites:
                if req.skill in subset:
                    adj[req.skill].append(sid)
                    in_degree[sid] += 1

        queue: deque[str] = deque([sid for sid in subset if in_degree[sid] == 0])
        result: list[str] = []

        while queue:
            curr = queue.popleft()
            result.append(curr)
            for neighbor in adj[curr]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) < len(subset):
            # Fallback in case of cycle (should not occur in validated DAG)
            remaining = [sid for sid in subset if sid not in result]
            result.extend(remaining)

        return result
