"""Market updates and role requirements diffing per SPEC §7.6 & §10.2.

Pure Python logic:
- Diff two role versions: added/removed skills, importance changes, target changes.
- apply_market_update: replans profile against updated role specifications.
- Produces Diff with trigger type "market_update" and requirement_changes.
"""
from __future__ import annotations

from engine.catalog import Catalog
from engine.models import (
    Diff,
    ItemChange,
    ProfileState,
    ReorderedItem,
    ReprioritizedItem,
    RequirementChange,
    Roadmap,
    Role,
    SkillRef,
    TriggerInfo,
)
from engine.readiness import compute_readiness
from engine.resources import JsonResourceProvider, ResourceProvider
from engine.roadmap import build_roadmap


def diff_role_requirements(old_role: Role, new_role: Role) -> list[RequirementChange]:
    """Compare two versions of a role definition to extract requirement changes."""
    old_skills = {rs.skill: rs for rs in old_role.skills}
    new_skills = {rs.skill: rs for rs in new_role.skills}

    changes: list[RequirementChange] = []

    # 1. Added skills
    for sid, n_rs in new_skills.items():
        if sid not in old_skills:
            changes.append(
                RequirementChange(
                    skill_id=sid,
                    skill_name=n_rs.skill_name or sid,
                    change="added",
                    from_=None,
                    to=n_rs.target,
                )
            )

    # 2. Removed skills
    for sid, o_rs in old_skills.items():
        if sid not in new_skills:
            changes.append(
                RequirementChange(
                    skill_id=sid,
                    skill_name=o_rs.skill_name or sid,
                    change="removed",
                    from_=o_rs.target,
                    to=None,
                )
            )

    # 3. Target and importance changes
    for sid, n_rs in new_skills.items():
        if sid in old_skills:
            o_rs = old_skills[sid]
            if n_rs.target != o_rs.target:
                changes.append(
                    RequirementChange(
                        skill_id=sid,
                        skill_name=n_rs.skill_name or sid,
                        change="target_changed",
                        from_=o_rs.target,
                        to=n_rs.target,
                    )
                )
            if n_rs.importance != o_rs.importance:
                changes.append(
                    RequirementChange(
                        skill_id=sid,
                        skill_name=n_rs.skill_name or sid,
                        change="importance_changed",
                        from_=o_rs.importance,
                        to=n_rs.importance,
                    )
                )

    return changes


def apply_market_update(
    profile_state: ProfileState,
    old_role: Role,
    new_role: Role,
    catalog: Catalog | None = None,
    resource_provider: ResourceProvider | None = None,
    completed_activity_ids: set[str] | None = None,
) -> tuple[Roadmap, Diff]:
    """Apply market role requirement updates and generate a diff."""
    cat = catalog or Catalog.from_data_dir()
    res_p = resource_provider or JsonResourceProvider.from_data_dir()

    old_roadmap = build_roadmap(
        profile_state=profile_state,
        role=old_role,
        catalog=cat,
        resource_provider=res_p,
        completed_activity_ids=completed_activity_ids,
    )

    new_roadmap = build_roadmap(
        profile_state=profile_state,
        role=new_role,
        catalog=cat,
        resource_provider=res_p,
        completed_activity_ids=completed_activity_ids,
    )

    readiness_before, _ = compute_readiness(profile_state, old_role, cat)
    readiness_after, _ = compute_readiness(profile_state, new_role, cat)

    req_changes = diff_role_requirements(old_role, new_role)

    # Compute items changes
    old_items_by_id = {it.item_id: it for it in old_roadmap.items if not it.is_capstone}
    new_items_by_id = {it.item_id: it for it in new_roadmap.items if not it.is_capstone}

    removed: list[ItemChange] = []
    for iid, it in old_items_by_id.items():
        if iid not in new_items_by_id:
            removed.append(ItemChange(item_id=iid, skill_name=it.skill_name, reason="Requirement removed in role update"))

    added: list[ItemChange] = []
    for iid, it in new_items_by_id.items():
        if iid not in old_items_by_id:
            added.append(ItemChange(item_id=iid, skill_name=it.skill_name, reason="New market requirement scheduled"))

    reordered: list[ReorderedItem] = []
    for iid, n_it in new_items_by_id.items():
        if iid in old_items_by_id:
            o_it = old_items_by_id[iid]
            if o_it.position != n_it.position:
                reordered.append(
                    ReorderedItem(
                        item_id=iid,
                        skill_name=n_it.skill_name,
                        from_position=o_it.position,
                        to_position=n_it.position,
                    )
                )

    reprioritized: list[ReprioritizedItem] = []
    for iid, n_it in new_items_by_id.items():
        if iid in old_items_by_id and n_it.why and old_items_by_id[iid].why:
            o_pri = old_items_by_id[iid].why.priority  # type: ignore[union-attr]
            n_pri = n_it.why.priority
            if abs(n_pri - o_pri) >= 5 and n_it.skill_id:
                reprioritized.append(
                    ReprioritizedItem(
                        skill_id=n_it.skill_id,
                        skill_name=n_it.skill_name,
                        from_priority=o_pri,
                        to_priority=n_pri,
                    )
                )

    # Facts
    facts: list[str] = [
        f"Role updated from {old_role.version} to {new_role.version}",
    ]
    for rc in req_changes:
        if rc.change == "added":
            facts.append(f"Market requirement added: {rc.skill_name} (target {rc.to:.1f})")
        elif rc.change == "target_changed":
            facts.append(f"Target increased for {rc.skill_name}: {rc.from_:.1f} -> {rc.to:.1f}")
        elif rc.change == "importance_changed":
            facts.append(f"Importance adjusted for {rc.skill_name}: {rc.from_:.2f} -> {rc.to:.2f}")

    if readiness_after != readiness_before:
        facts.append(f"Readiness {readiness_before:.1f} -> {readiness_after:.1f}")

    diff = Diff(
        trigger=TriggerInfo(type="market_update"),
        readiness_before=readiness_before,
        readiness_after=readiness_after,
        level_changes=[],
        unlocked=[],
        removed=removed,
        added=added,
        reordered=reordered,
        reprioritized=reprioritized,
        requirement_changes=req_changes,
        facts=facts,
    )

    return new_roadmap, diff
