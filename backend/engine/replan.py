"""Progress tracking, adaptive replanning, and state diff generation per SPEC §7.5 & §10.2.

Pure Python logic:
- on complete_skill(skill): level = target; each prerequisite level = max(level, min_level)
- on complete_activity(activity): level += activity.level_gain (cap 10)
- on mark_known(skill, level): level = level
- Computes state Diff: level_changes, unlocked, removed, added, reordered, reprioritized, and facts.
- Idempotent: repeating an action returns an empty diff with facts ["Already complete"].
"""
from __future__ import annotations

from typing import Sequence
from engine.calibrate import calibrate_skill_level
from engine.catalog import Catalog
from engine.models import (
    Activity,
    Diff,
    ItemChange,
    LevelChange,
    ProfileSkillState,
    ProfileState,
    ReorderedItem,
    ReprioritizedItem,
    Roadmap,
    Role,
    SkillRef,
    TriggerInfo,
)
from engine.readiness import compute_readiness
from engine.resources import JsonResourceProvider, ResourceProvider
from engine.roadmap import build_roadmap


def _build_diff(
    trigger: TriggerInfo,
    old_profile: ProfileState,
    new_profile: ProfileState,
    old_roadmap: Roadmap,
    new_roadmap: Roadmap,
    role: Role,
    catalog: Catalog,
    level_changes: list[LevelChange],
) -> Diff:
    """Construct deterministic Diff model comparing old and new states."""
    readiness_before, _ = compute_readiness(old_profile, role, catalog)
    readiness_after, _ = compute_readiness(new_profile, role, catalog)

    # 1. Unlocked skills (status changed from locked -> available)
    old_status = {it.skill_id: it.status for it in old_roadmap.items if it.skill_id}
    new_status = {it.skill_id: it.status for it in new_roadmap.items if it.skill_id}

    unlocked: list[SkillRef] = []
    for sid, n_stat in new_status.items():
        o_stat = old_status.get(sid)
        if o_stat == "locked" and n_stat == "available":
            sk = catalog.get_skill(sid)
            s_name = sk.name if sk else sid
            unlocked.append(SkillRef(skill_id=sid, skill_name=s_name))

    # 2. Removed items
    old_items_by_id = {it.item_id: it for it in old_roadmap.items if not it.is_capstone}
    new_items_by_id = {it.item_id: it for it in new_roadmap.items if not it.is_capstone}

    removed: list[ItemChange] = []
    for iid, it in old_items_by_id.items():
        if iid not in new_items_by_id:
            reason = f"{it.skill_name} requirements met or no longer needed"
            removed.append(ItemChange(item_id=iid, skill_name=it.skill_name, reason=reason))

    # 3. Added items
    added: list[ItemChange] = []
    for iid, it in new_items_by_id.items():
        if iid not in old_items_by_id:
            reason = f"Required milestone {it.skill_name} scheduled"
            added.append(ItemChange(item_id=iid, skill_name=it.skill_name, reason=reason))

    # 4. Reordered items (position changed among items present in both)
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

    # 5. Reprioritized items (|delta| >= 5)
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

    # 6. Deterministic Facts sentences
    facts: list[str] = []
    for lc in level_changes:
        if lc.skill_id == trigger.skill_id:
            facts.append(f"{lc.skill_name} ({lc.skill_id}) completed: level {lc.from_:.1f} -> {lc.to:.1f}")
        else:
            facts.append(f"{lc.skill_name} ({lc.skill_id}) prerequisite updated: level {lc.from_:.1f} -> {lc.to:.1f}")

    for u in unlocked:
        facts.append(f"{u.skill_name} is now unlocked")

    if readiness_after != readiness_before:
        facts.append(f"Readiness {readiness_before:.1f} -> {readiness_after:.1f}")

    if not facts:
        facts.append("Roadmap schedule verified up-to-date")

    return Diff(
        trigger=trigger,
        readiness_before=readiness_before,
        readiness_after=readiness_after,
        level_changes=level_changes,
        unlocked=unlocked,
        removed=removed,
        added=added,
        reordered=reordered,
        reprioritized=reprioritized,
        requirement_changes=[],
        facts=facts,
    )


def complete_skill(
    profile_state: ProfileState,
    skill_id: str,
    role: Role,
    catalog: Catalog | None = None,
    resource_provider: ResourceProvider | None = None,
    completed_activity_ids: set[str] | None = None,
) -> tuple[ProfileState, Roadmap, Diff]:
    """Mark a full skill as mastered.

    SPEC §7.5:
    - level[skill] = target
    - each prerequisite level = max(level, min_level)
    - Recomputes roadmap and diff
    - Idempotent if skill is already >= target
    """
    cat = catalog or Catalog.from_data_dir()
    res_p = resource_provider or JsonResourceProvider.from_data_dir()

    # Determine target level
    role_skill = next((rs for rs in role.skills if rs.skill == skill_id), None)
    cat_skill = cat.get_skill(skill_id)
    s_name = cat_skill.name if cat_skill else skill_id
    target_lvl = role_skill.target if role_skill else 7.0

    current_skill = profile_state.skills.get(skill_id)
    current_lvl = current_skill.level if current_skill else 0.0

    old_roadmap = build_roadmap(
        profile_state=profile_state,
        role=role,
        catalog=cat,
        resource_provider=res_p,
        completed_activity_ids=completed_activity_ids,
    )

    # Idempotency check
    if current_lvl >= target_lvl:
        rd, _ = compute_readiness(profile_state, role, cat)
        diff = Diff(
            trigger=TriggerInfo(type="complete_skill", skill_id=skill_id, skill_name=s_name),
            readiness_before=rd,
            readiness_after=rd,
            level_changes=[],
            unlocked=[],
            removed=[],
            added=[],
            reordered=[],
            reprioritized=[],
            requirement_changes=[],
            facts=["Already complete"],
        )
        return profile_state, old_roadmap, diff

    # Copy skills
    new_skills = dict(profile_state.skills)
    level_changes: list[LevelChange] = []

    # 1. Update the skill itself to target
    new_skills[skill_id] = calibrate_skill_level(
        skill_id=skill_id,
        skill_name=s_name,
        override_level=target_lvl,
    )
    level_changes.append(
        LevelChange(
            skill_id=skill_id,
            skill_name=s_name,
            from_=current_lvl,
            to=target_lvl,
        )
    )

    # 2. Update prerequisites: mastery implies prerequisites -> max(level, min_level)
    if cat_skill:
        for req in cat_skill.prerequisites:
            p_curr = new_skills.get(req.skill)
            p_lvl = p_curr.level if p_curr else 0.0
            if p_lvl < req.min_level:
                p_cat_sk = cat.get_skill(req.skill)
                p_name = p_cat_sk.name if p_cat_sk else req.skill
                new_skills[req.skill] = calibrate_skill_level(
                    skill_id=req.skill,
                    skill_name=p_name,
                    override_level=req.min_level,
                )
                level_changes.append(
                    LevelChange(
                        skill_id=req.skill,
                        skill_name=p_name,
                        from_=p_lvl,
                        to=req.min_level,
                    )
                )

    new_profile = profile_state.model_copy(update={"skills": new_skills})

    new_roadmap = build_roadmap(
        profile_state=new_profile,
        role=role,
        catalog=cat,
        resource_provider=res_p,
        completed_activity_ids=completed_activity_ids,
    )

    diff = _build_diff(
        trigger=TriggerInfo(type="complete_skill", skill_id=skill_id, skill_name=s_name),
        old_profile=profile_state,
        new_profile=new_profile,
        old_roadmap=old_roadmap,
        new_roadmap=new_roadmap,
        role=role,
        catalog=cat,
        level_changes=level_changes,
    )

    return new_profile, new_roadmap, diff


def complete_activity(
    profile_state: ProfileState,
    activity_id: str,
    role: Role,
    catalog: Catalog | None = None,
    resource_provider: ResourceProvider | None = None,
    completed_activity_ids: set[str] | None = None,
) -> tuple[ProfileState, Roadmap, Diff]:
    """Complete a single learning activity.

    SPEC §7.5:
    - level[skill] = min(10, level[skill] + activity.level_gain)
    - Skill is done when level >= target
    """
    cat = catalog or Catalog.from_data_dir()
    res_p = resource_provider or JsonResourceProvider.from_data_dir()
    acts_done = set(completed_activity_ids or set())

    # Find the activity
    target_act = next((a for a in getattr(res_p, "activities", []) if a.activity_id == activity_id), None)
    if not target_act:
        old_rm = build_roadmap(profile_state, role, catalog=cat, resource_provider=res_p, completed_activity_ids=acts_done)
        rd, _ = compute_readiness(profile_state, role, cat)
        return (
            profile_state,
            old_rm,
            Diff(
                trigger=TriggerInfo(type="complete_activity", activity_id=activity_id),
                readiness_before=rd,
                readiness_after=rd,
                facts=["Activity not found"],
            ),
        )

    acts_done.add(activity_id)
    primary_skill = target_act.skills[0] if target_act.skills else ""
    cat_skill = cat.get_skill(primary_skill)
    s_name = cat_skill.name if cat_skill else primary_skill

    curr_skill = profile_state.skills.get(primary_skill)
    old_lvl = curr_skill.level if curr_skill else 0.0
    new_lvl = min(10.0, round(old_lvl + target_act.level_gain, 1))

    old_roadmap = build_roadmap(profile_state, role, catalog=cat, resource_provider=res_p, completed_activity_ids=acts_done)

    new_skills = dict(profile_state.skills)
    new_skills[primary_skill] = calibrate_skill_level(
        skill_id=primary_skill,
        skill_name=s_name,
        override_level=new_lvl,
    )
    new_profile = profile_state.model_copy(update={"skills": new_skills})

    new_roadmap = build_roadmap(new_profile, role, catalog=cat, resource_provider=res_p, completed_activity_ids=acts_done)

    level_changes = [
        LevelChange(
            skill_id=primary_skill,
            skill_name=s_name,
            from_=old_lvl,
            to=new_lvl,
        )
    ]

    diff = _build_diff(
        trigger=TriggerInfo(type="complete_activity", skill_id=primary_skill, skill_name=s_name, activity_id=activity_id),
        old_profile=profile_state,
        new_profile=new_profile,
        old_roadmap=old_roadmap,
        new_roadmap=new_roadmap,
        role=role,
        catalog=cat,
        level_changes=level_changes,
    )

    return new_profile, new_roadmap, diff


def mark_known(
    profile_state: ProfileState,
    skill_id: str,
    level: float,
    role: Role,
    catalog: Catalog | None = None,
    resource_provider: ResourceProvider | None = None,
    completed_activity_ids: set[str] | None = None,
) -> tuple[ProfileState, Roadmap, Diff]:
    """Manually update a skill's proficiency level."""
    cat = catalog or Catalog.from_data_dir()
    res_p = resource_provider or JsonResourceProvider.from_data_dir()

    cat_skill = cat.get_skill(skill_id)
    s_name = cat_skill.name if cat_skill else skill_id
    curr_skill = profile_state.skills.get(skill_id)
    old_lvl = curr_skill.level if curr_skill else 0.0
    target_lvl = round(max(0.0, min(10.0, float(level))), 1)

    old_roadmap = build_roadmap(profile_state, role, catalog=cat, resource_provider=res_p, completed_activity_ids=completed_activity_ids)

    new_skills = dict(profile_state.skills)
    new_skills[skill_id] = calibrate_skill_level(
        skill_id=skill_id,
        skill_name=s_name,
        override_level=target_lvl,
    )
    new_profile = profile_state.model_copy(update={"skills": new_skills})

    new_roadmap = build_roadmap(new_profile, role, catalog=cat, resource_provider=res_p, completed_activity_ids=completed_activity_ids)

    level_changes = [
        LevelChange(
            skill_id=skill_id,
            skill_name=s_name,
            from_=old_lvl,
            to=target_lvl,
        )
    ]

    diff = _build_diff(
        trigger=TriggerInfo(type="mark_known", skill_id=skill_id, skill_name=s_name),
        old_profile=profile_state,
        new_profile=new_profile,
        old_roadmap=old_roadmap,
        new_roadmap=new_roadmap,
        role=role,
        catalog=cat,
        level_changes=level_changes,
    )

    return new_profile, new_roadmap, diff
