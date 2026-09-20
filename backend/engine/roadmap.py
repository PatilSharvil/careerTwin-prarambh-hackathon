"""Deterministic roadmap generator per SPEC §7.4.

Algorithm:
1. Candidates = skills with gap > 0.
2. Prerequisite closure: add any prerequisite whose min_level is unmet.
3. Kahn topological sort with a max-heap on priority as tie-breaker.
4. Hours = gap x hours_per_level x experience_multiplier (beginner 1.2 / experienced 0.85).
5. Sequential pack into weeks by weekly_hours (week_start..week_end).
6. Phases: Foundation (depth 0), Core (depth 1-2), Applied (depth >=3 or category Deployment), Capstone (final item).
7. Capstone: 12 hours, combines top-3 role skills.
8. Stretch = True for items ending after deadline_weeks.
9. Attach activities and mastery criteria.
10. Roadmap dependency graph (nodes & edges).
"""
from __future__ import annotations

import heapq
import math
from collections import defaultdict, deque
from typing import Sequence
from engine.catalog import Catalog
from engine.gaps import compute_gaps_and_strengths
from engine.models import (
    GraphEdge,
    GraphNode,
    Phase,
    Prereq,
    ProfileState,
    Roadmap,
    RoadmapGraph,
    RoadmapItem,
    Role,
    SkillRef,
    SkillStatus,
)
from engine.resources import JsonResourceProvider, ResourceProvider
from engine.why import build_why


def build_roadmap(
    profile_state: ProfileState,
    role: Role,
    interests: Sequence[str] | None = None,
    weekly_hours: int | None = None,
    deadline_weeks: int | None = None,
    catalog: Catalog | None = None,
    resource_provider: ResourceProvider | None = None,
    completed_activity_ids: set[str] | None = None,
) -> Roadmap:
    """Build a deterministic personalized career roadmap."""
    cat = catalog or Catalog.from_data_dir()
    res_provider = resource_provider or JsonResourceProvider.from_data_dir()
    completed_acts = completed_activity_ids or set()

    budget_weekly_hours = weekly_hours or profile_state.weekly_hours or 10
    budget_deadline_weeks = deadline_weeks or profile_state.deadline_weeks or 12
    user_interests = list(interests or profile_state.interests or [])

    # 1. Candidates: Role skills with gap > 0
    gaps, strengths, _ = compute_gaps_and_strengths(
        profile_state=profile_state,
        role=role,
        interests=user_interests,
        catalog=cat,
    )

    candidates: dict[str, dict] = {}
    for g in gaps:
        candidates[g.skill_id] = {
            "skill_id": g.skill_id,
            "skill_name": g.skill_name,
            "category": g.category,
            "level": g.level,
            "target": g.target,
            "gap": g.gap,
            "importance": g.importance,
            "priority": g.priority,
            "priority_label": g.priority_label,
            "raw_priority": g.raw_priority,
            "unblocks": g.unblocks,
            "status": g.status,
            "flag": g.flag,
            "is_prereq_only": False,
        }

    # 2. Prerequisite closure
    # Add any prerequisite whose min_level isn't met, even if not a role skill
    closure_queue: deque[str] = deque(list(candidates.keys()))
    while closure_queue:
        curr_sid = closure_queue.popleft()
        cat_skill = cat.get_skill(curr_sid)
        if not cat_skill:
            continue

        for req in cat_skill.prerequisites:
            req_sid = req.skill
            user_skill = profile_state.skills.get(req_sid)
            user_lvl = user_skill.level if user_skill else 0.0

            if user_lvl < req.min_level:
                if req_sid in candidates:
                    # If already in candidates as prereq_only, ensure target covers required min_level
                    if candidates[req_sid]["is_prereq_only"]:
                        new_target = max(candidates[req_sid]["target"], req.min_level)
                        candidates[req_sid]["target"] = new_target
                        candidates[req_sid]["gap"] = max(0.0, round(new_target - user_lvl, 1))
                else:
                    # New prerequisite-only candidate
                    req_cat_skill = cat.get_skill(req_sid)
                    req_name = req_cat_skill.name if req_cat_skill else req_sid
                    req_cat = req_cat_skill.category if req_cat_skill else "Foundations"
                    req_gap = max(0.0, round(req.min_level - user_lvl, 1))

                    candidates[req_sid] = {
                        "skill_id": req_sid,
                        "skill_name": req_name,
                        "category": req_cat,
                        "level": user_lvl,
                        "target": req.min_level,
                        "gap": req_gap,
                        "importance": 0.5,
                        "priority": 85,  # High priority because it blocks prerequisites
                        "priority_label": "High",
                        "raw_priority": 0.5 * req_gap * 1.5,
                        "unblocks": [SkillRef(skill_id=curr_sid, skill_name=candidates[curr_sid]["skill_name"])],
                        "status": "available",
                        "flag": user_skill.flag if user_skill else None,
                        "is_prereq_only": True,
                    }
                    closure_queue.append(req_sid)

    # 3. DAG Kahn Topological Sort with Max-Heap on Priority
    candidate_sids = set(candidates.keys())
    in_degree: dict[str, int] = {sid: 0 for sid in candidate_sids}
    graph_adj: dict[str, list[str]] = defaultdict(list)

    for sid in candidate_sids:
        sk = cat.get_skill(sid)
        if not sk:
            continue
        for req in sk.prerequisites:
            if req.skill in candidate_sids:
                graph_adj[req.skill].append(sid)
                in_degree[sid] += 1

    # Max-heap entries: (-priority, -raw_priority, -importance, -gap, sid)
    heap: list[tuple[int, float, float, float, str]] = []
    for sid in candidate_sids:
        if in_degree[sid] == 0:
            c = candidates[sid]
            heapq.heappush(
                heap,
                (
                    -c["priority"],
                    -c["raw_priority"],
                    -c["importance"],
                    -c["gap"],
                    sid,
                ),
            )

    topological_order: list[str] = []
    while heap:
        _, _, _, _, sid = heapq.heappop(heap)
        topological_order.append(sid)
        for neighbor in graph_adj[sid]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                c_n = candidates[neighbor]
                heapq.heappush(
                    heap,
                    (
                        -c_n["priority"],
                        -c_n["raw_priority"],
                        -c_n["importance"],
                        -c_n["gap"],
                        neighbor,
                    ),
                )

    # In case of remaining nodes
    for sid in candidate_sids:
        if sid not in topological_order:
            topological_order.append(sid)

    # 4. Hours Calculation per skill
    # hours = gap x hours_per_level x experience_multiplier (beginner 1.2 / experienced 0.85)
    exp = profile_state.experience_years
    if exp <= 1.0:
        exp_multiplier = 1.2
    elif exp >= 3.0:
        exp_multiplier = 0.85
    else:
        exp_multiplier = 1.0

    # 5. Phases: Foundation (depth 0), Core (depth 1-2), Applied (depth >= 3 or category Deployment)
    depth: dict[str, int] = {}
    for sid in topological_order:
        sk = cat.get_skill(sid)
        prereqs_in_roadmap = [req.skill for req in (sk.prerequisites if sk else []) if req.skill in candidate_sids]
        if not prereqs_in_roadmap:
            depth[sid] = 0
        else:
            depth[sid] = 1 + max(depth.get(p, 0) for p in prereqs_in_roadmap)

    # Sequential week packing
    curr_week = 1
    curr_week_hours = 0.0

    items: list[RoadmapItem] = []
    position = 1

    for sid in topological_order:
        cand = candidates[sid]
        cat_skill = cat.get_skill(sid)
        h_per_lvl = cat_skill.hours_per_level if cat_skill else 10
        item_hours = max(2.0, round(cand["gap"] * h_per_lvl * exp_multiplier, 1))

        # Schedule across weeks respecting weekly budget
        weeks_needed = max(1, math.ceil(item_hours / budget_weekly_hours))
        weekly_slice = item_hours / weeks_needed

        if curr_week_hours + weekly_slice > budget_weekly_hours + 1e-4:
            curr_week += 1
            curr_week_hours = 0.0

        week_start = curr_week
        week_end = week_start + weeks_needed - 1
        curr_week_hours += weekly_slice

        if curr_week_hours >= budget_weekly_hours - 1e-4:
            curr_week = week_end + 1
            curr_week_hours = 0.0
        else:
            curr_week = week_end

        # Determine phase
        if cand["category"] == "Deployment":
            phase: Phase = "Applied"
        elif depth[sid] == 0:
            phase = "Foundation"
        elif depth[sid] in (1, 2):
            phase = "Core"
        else:
            phase = "Applied"

        stretch = week_end > budget_deadline_weeks

        # Activities & Criteria
        activities = res_provider.get(sid, cand["level"], user_interests, k=3)
        for act in activities:
            if act.activity_id in completed_acts:
                act.completed = True

        criteria = cat_skill.mastery_criteria if (cat_skill and cat_skill.mastery_criteria) else [
            f"Demonstrate applied proficiency in {cand['skill_name']}"
        ]

        # Prerequisites with met status
        prereqs_list: list[Prereq] = []
        is_locked = False
        if cat_skill:
            for req in cat_skill.prerequisites:
                p_skill = profile_state.skills.get(req.skill)
                p_lvl = p_skill.level if p_skill else 0.0
                met = p_lvl >= req.min_level
                if not met:
                    is_locked = True
                p_cat_sk = cat.get_skill(req.skill)
                p_name = p_cat_sk.name if p_cat_sk else req.skill
                prereqs_list.append(
                    Prereq(
                        skill_id=req.skill,
                        skill_name=p_name,
                        min_level=req.min_level,
                        met=met,
                    )
                )

        status: SkillStatus = "locked" if is_locked else "available"

        # Why rationale
        why = build_why(
            skill_name=cand["skill_name"],
            role_title=role.title,
            level=cand["level"],
            target=cand["target"],
            gap=cand["gap"],
            importance=cand["importance"],
            priority=cand["priority"],
            priority_label=cand["priority_label"],
            unblocks=cand["unblocks"],
            interest_match=bool(cat_skill and (set(t.lower() for t in cat_skill.tags) & set(i.lower() for i in user_interests))),
            evidence_snippet=cand.get("snippet"),
            user_interests=user_interests,
        )

        item = RoadmapItem(
            item_id=f"rm_{sid}",
            position=position,
            skill_id=sid,
            skill_name=cand["skill_name"],
            phase=phase,
            week_start=week_start,
            week_end=week_end,
            hours=item_hours,
            status=status,
            stretch=stretch,
            is_capstone=False,
            combines=[],
            prerequisites=prereqs_list,
            activities=activities,
            completion_criteria=criteria,
            why=why,
        )
        items.append(item)
        position += 1

    # 7. Capstone Item (combining top-3 role skills by importance)
    sorted_role_skills = sorted(role.skills, key=lambda rs: rs.importance, reverse=True)
    top_3_role_skills = sorted_role_skills[:3]
    combines_refs = [
        SkillRef(
            skill_id=rs.skill,
            skill_name=cat.get_skill(rs.skill).name if cat.get_skill(rs.skill) else rs.skill,
        )
        for rs in top_3_role_skills
    ]

    capstone_hours = 12.0
    capstone_weeks = max(1, math.ceil(capstone_hours / budget_weekly_hours))
    if curr_week_hours > 0:
        curr_week += 1
        curr_week_hours = 0.0

    cap_week_start = curr_week
    cap_week_end = cap_week_start + capstone_weeks - 1
    cap_stretch = cap_week_end > budget_deadline_weeks

    cap_resource = res_provider.get_capstone(role.role_id)
    cap_activities: list[Activity] = [cap_resource] if cap_resource else []

    capstone_item = RoadmapItem(
        item_id="rm_capstone",
        position=position,
        skill_id=None,
        skill_name="Capstone Project",
        phase="Capstone",
        week_start=cap_week_start,
        week_end=cap_week_end,
        hours=capstone_hours,
        status="locked" if any(it.status != "done" for it in items) else "available",
        stretch=cap_stretch,
        is_capstone=True,
        combines=combines_refs,
        prerequisites=[],
        activities=cap_activities,
        completion_criteria=[
            f"Deliver production capstone integrating {', '.join(r.skill_name for r in combines_refs)}",
            "Demonstrate end-to-end functionality, evaluation benchmarks, and deployment artifacts",
        ],
        why=None,
    )
    items.append(capstone_item)

    # 8. Dependency Graph
    graph_nodes: list[GraphNode] = []
    graph_edges: list[GraphEdge] = []
    item_ids_set = {it.item_id for it in items}

    for it in items:
        graph_nodes.append(
            GraphNode(
                id=it.item_id,
                label=it.skill_name,
                status=it.status,
                phase=it.phase,
            )
        )
        if it.is_capstone:
            for c in it.combines:
                source_id = f"rm_{c.skill_id}"
                if source_id in item_ids_set:
                    graph_edges.append(GraphEdge(source=source_id, target=it.item_id))
        else:
            for req in it.prerequisites:
                source_id = f"rm_{req.skill_id}"
                if source_id in item_ids_set:
                    graph_edges.append(GraphEdge(source=source_id, target=it.item_id))

    total_weeks = max((it.week_end for it in items), default=0)
    total_hours = round(sum(it.hours for it in items), 1)

    phases_present: list[Phase] = [
        p for p in ["Foundation", "Core", "Applied", "Capstone"] if any(it.phase == p for it in items)
    ]

    return Roadmap(
        version=1,
        total_weeks=total_weeks,
        total_hours=total_hours,
        deadline_weeks=budget_deadline_weeks,
        weekly_hours=budget_weekly_hours,
        phases=phases_present,
        items=items,
        graph=RoadmapGraph(nodes=graph_nodes, edges=graph_edges),
    )
