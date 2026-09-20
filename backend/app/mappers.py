"""Mappers converting internal Career Engine models into API contract schemas.

Follows SPEC §10.1 & §10.2:
- Round levels to 1 decimal
- Round priority to int
- Round readiness to 1 decimal
- Round importance to 2 decimals
"""
from __future__ import annotations

from typing import Any

from app import schemas
from engine import models


def to_schema_skill_ref(ref: models.SkillRef | dict[str, Any]) -> schemas.SkillRef:
    if isinstance(ref, dict):
        return schemas.SkillRef(skill_id=ref["skill_id"], skill_name=ref["skill_name"])
    return schemas.SkillRef(skill_id=ref.skill_id, skill_name=ref.skill_name)


def to_schema_prereq(p: models.PrereqItem | schemas.Prereq | dict[str, Any]) -> schemas.Prereq:
    if isinstance(p, dict):
        return schemas.Prereq(
            skill_id=p["skill_id"],
            skill_name=p["skill_name"],
            min_level=round(float(p["min_level"]), 1),
            met=bool(p["met"]),
        )
    return schemas.Prereq(
        skill_id=p.skill_id,
        skill_name=p.skill_name,
        min_level=round(float(p.min_level), 1),
        met=bool(p.met),
    )


def to_schema_activity(act: models.Activity | schemas.Activity | dict[str, Any]) -> schemas.Activity:
    if isinstance(act, dict):
        return schemas.Activity(
            activity_id=act["activity_id"],
            type=act["type"],
            title=act["title"],
            provider=act["provider"],
            url=act["url"],
            hours=round(float(act["hours"]), 1),
            level_gain=round(float(act["level_gain"]), 1),
            skills=list(act.get("skills", [])),
            level_from=round(float(act["level_from"]), 1),
            level_to=round(float(act["level_to"]), 1),
            completed=bool(act.get("completed", False)),
        )
    return schemas.Activity(
        activity_id=act.activity_id,
        type=act.type,
        title=act.title,
        provider=act.provider,
        url=act.url,
        hours=round(float(act.hours), 1),
        level_gain=round(float(act.level_gain), 1),
        skills=list(act.skills),
        level_from=round(float(act.level_from), 1),
        level_to=round(float(act.level_to), 1),
        completed=bool(act.completed),
    )


def to_schema_why(w: models.Why | schemas.Why | dict[str, Any] | None) -> schemas.Why | None:
    if w is None:
        return None
    if isinstance(w, dict):
        return schemas.Why(
            level=round(float(w["level"]), 1),
            target=round(float(w["target"]), 1),
            gap=round(float(w["gap"]), 1),
            importance=round(float(w["importance"]), 2),
            priority=int(round(float(w["priority"]))),
            priority_label=w["priority_label"],
            unblocks=[to_schema_skill_ref(u) for u in w.get("unblocks", [])],
            interest_match=bool(w.get("interest_match", False)),
            evidence_snippet=w.get("evidence_snippet"),
            narrative=w.get("narrative", ""),
            narrative_source=w.get("narrative_source", "template"),
        )
    return schemas.Why(
        level=round(float(w.level), 1),
        target=round(float(w.target), 1),
        gap=round(float(w.gap), 1),
        importance=round(float(w.importance), 2),
        priority=int(round(float(w.priority))),
        priority_label=w.priority_label,
        unblocks=[to_schema_skill_ref(u) for u in w.unblocks],
        interest_match=bool(w.interest_match),
        evidence_snippet=w.evidence_snippet,
        narrative=w.narrative,
        narrative_source=w.narrative_source,
    )


def to_schema_roadmap_item(it: models.RoadmapItem | schemas.RoadmapItem | dict[str, Any]) -> schemas.RoadmapItem:
    if isinstance(it, dict):
        return schemas.RoadmapItem(
            item_id=it["item_id"],
            position=int(it["position"]),
            skill_id=it.get("skill_id"),
            skill_name=it["skill_name"],
            phase=it["phase"],
            week_start=int(it["week_start"]),
            week_end=int(it["week_end"]),
            hours=round(float(it["hours"]), 1),
            status=it["status"],
            stretch=bool(it.get("stretch", False)),
            is_capstone=bool(it.get("is_capstone", False)),
            combines=[to_schema_skill_ref(c) for c in it.get("combines", [])],
            prerequisites=[to_schema_prereq(p) for p in it.get("prerequisites", [])],
            activities=[to_schema_activity(a) for a in it.get("activities", [])],
            completion_criteria=list(it.get("completion_criteria", [])),
            why=to_schema_why(it.get("why")),
        )
    return schemas.RoadmapItem(
        item_id=it.item_id,
        position=int(it.position),
        skill_id=it.skill_id,
        skill_name=it.skill_name,
        phase=it.phase,
        week_start=int(it.week_start),
        week_end=int(it.week_end),
        hours=round(float(it.hours), 1),
        status=it.status,
        stretch=bool(it.stretch),
        is_capstone=bool(it.is_capstone),
        combines=[to_schema_skill_ref(c) for c in it.combines],
        prerequisites=[to_schema_prereq(p) for p in it.prerequisites],
        activities=[to_schema_activity(a) for a in it.activities],
        completion_criteria=list(it.completion_criteria),
        why=to_schema_why(it.why),
    )


def to_schema_graph(
    g: models.RoadmapGraph | schemas.RoadmapGraph | dict[str, Any]
) -> schemas.RoadmapGraph:
    if isinstance(g, dict):
        nodes = [
            schemas.GraphNode(
                id=n["id"],
                label=n["label"],
                status=n["status"],
                phase=n["phase"],
            )
            for n in g.get("nodes", [])
        ]
        edges = [
            schemas.GraphEdge(source=e["source"], target=e["target"])
            for e in g.get("edges", [])
        ]
        return schemas.RoadmapGraph(nodes=nodes, edges=edges)

    nodes = [
        schemas.GraphNode(id=n.id, label=n.label, status=n.status, phase=n.phase)
        for n in g.nodes
    ]
    edges = [schemas.GraphEdge(source=e.source, target=e.target) for e in g.edges]
    return schemas.RoadmapGraph(nodes=nodes, edges=edges)


def to_schema_roadmap(rm: models.Roadmap | schemas.Roadmap | dict[str, Any]) -> schemas.Roadmap:
    if isinstance(rm, dict):
        return schemas.Roadmap(
            version=int(rm["version"]),
            total_weeks=int(rm["total_weeks"]),
            total_hours=round(float(rm["total_hours"]), 1),
            deadline_weeks=int(rm["deadline_weeks"]),
            weekly_hours=round(float(rm["weekly_hours"]), 1),
            phases=list(rm.get("phases", [])),
            items=[to_schema_roadmap_item(i) for i in rm.get("items", [])],
            graph=to_schema_graph(rm["graph"]),
        )
    return schemas.Roadmap(
        version=int(rm.version),
        total_weeks=int(rm.total_weeks),
        total_hours=round(float(rm.total_hours), 1),
        deadline_weeks=int(rm.deadline_weeks),
        weekly_hours=round(float(rm.weekly_hours), 1),
        phases=list(rm.phases),
        items=[to_schema_roadmap_item(i) for i in rm.items],
        graph=to_schema_graph(rm.graph),
    )


def to_schema_category_score(
    cs: models.CategoryScore | schemas.CategoryScore | dict[str, Any]
) -> schemas.CategoryScore:
    if isinstance(cs, dict):
        return schemas.CategoryScore(
            category=cs["category"],
            score=round(float(cs["score"]), 1),
        )
    return schemas.CategoryScore(
        category=cs.category,
        score=round(float(cs.score), 1),
    )


def to_schema_gap(g: models.GapItem | schemas.Gap | dict[str, Any]) -> schemas.Gap:
    if isinstance(g, dict):
        return schemas.Gap(
            skill_id=g["skill_id"],
            skill_name=g["skill_name"],
            category=g["category"],
            level=round(float(g["level"]), 1),
            target=round(float(g["target"]), 1),
            gap=round(float(g["gap"]), 1),
            importance=round(float(g["importance"]), 2),
            dependency_impact=round(float(g["dependency_impact"]), 2),
            priority=int(round(float(g["priority"]))),
            priority_label=g["priority_label"],
            status=g["status"],
            flag=g.get("flag"),
            unblocks=[to_schema_skill_ref(u) for u in g.get("unblocks", [])],
        )
    return schemas.Gap(
        skill_id=g.skill_id,
        skill_name=g.skill_name,
        category=g.category,
        level=round(float(g.level), 1),
        target=round(float(g.target), 1),
        gap=round(float(g.gap), 1),
        importance=round(float(g.importance), 2),
        dependency_impact=round(float(g.dependency_impact), 2),
        priority=int(round(float(g.priority))),
        priority_label=g.priority_label,
        status=g.status,
        flag=g.flag,
        unblocks=[to_schema_skill_ref(u) for u in g.unblocks],
    )


def to_schema_strength(
    s: models.Strength | schemas.Strength | dict[str, Any]
) -> schemas.Strength:
    if isinstance(s, dict):
        return schemas.Strength(
            skill_id=s["skill_id"],
            skill_name=s["skill_name"],
            level=round(float(s["level"]), 1),
            target=round(float(s["target"]), 1),
        )
    return schemas.Strength(
        skill_id=s.skill_id,
        skill_name=s.skill_name,
        level=round(float(s.level), 1),
        target=round(float(s.target), 1),
    )


def to_schema_radar_point(
    r: models.RadarPoint | schemas.RadarPoint | dict[str, Any]
) -> schemas.RadarPoint:
    if isinstance(r, dict):
        return schemas.RadarPoint(
            skill_id=r["skill_id"],
            skill_name=r["skill_name"],
            current=round(float(r["current"]), 1),
            target=round(float(r["target"]), 1),
        )
    return schemas.RadarPoint(
        skill_id=r.skill_id,
        skill_name=r.skill_name,
        current=round(float(r.current), 1),
        target=round(float(r.target), 1),
    )


def to_schema_analysis(
    an: models.Analysis | schemas.Analysis | dict[str, Any]
) -> schemas.Analysis:
    if isinstance(an, dict):
        return schemas.Analysis(
            readiness=round(float(an["readiness"]), 1),
            readiness_note=an.get("readiness_note", "skill-alignment score, not a hiring prediction"),
            category_scores=[to_schema_category_score(cs) for cs in an.get("category_scores", [])],
            gaps=[to_schema_gap(g) for g in an.get("gaps", [])],
            strengths=[to_schema_strength(s) for s in an.get("strengths", [])],
            radar=[to_schema_radar_point(r) for r in an.get("radar", [])],
        )
    return schemas.Analysis(
        readiness=round(float(an.readiness), 1),
        readiness_note=an.readiness_note,
        category_scores=[to_schema_category_score(cs) for cs in an.category_scores],
        gaps=[to_schema_gap(g) for g in an.gaps],
        strengths=[to_schema_strength(s) for s in an.strengths],
        radar=[to_schema_radar_point(r) for r in an.radar],
    )


def to_schema_diff_trigger(
    trig: models.TriggerInfo | schemas.DiffTrigger | dict[str, Any]
) -> schemas.DiffTrigger:
    if isinstance(trig, dict):
        return schemas.DiffTrigger(
            type=trig["type"],
            skill_id=trig.get("skill_id"),
            skill_name=trig.get("skill_name"),
            activity_id=trig.get("activity_id"),
        )
    return schemas.DiffTrigger(
        type=trig.type,
        skill_id=trig.skill_id,
        skill_name=trig.skill_name,
        activity_id=trig.activity_id,
    )


def to_schema_level_change(
    lc: models.LevelChange | schemas.LevelChange | dict[str, Any]
) -> schemas.LevelChange:
    if isinstance(lc, dict):
        from_val = lc.get("from") if "from" in lc else lc.get("from_")
        return schemas.LevelChange(
            skill_id=lc["skill_id"],
            skill_name=lc["skill_name"],
            from_=round(float(from_val), 1),
            to=round(float(lc["to"]), 1),
        )
    return schemas.LevelChange(
        skill_id=lc.skill_id,
        skill_name=lc.skill_name,
        from_=round(float(lc.from_), 1),
        to=round(float(lc.to), 1),
    )


def to_schema_diff_removed(
    r: models.ItemChange | schemas.DiffRemovedItem | dict[str, Any]
) -> schemas.DiffRemovedItem:
    if isinstance(r, dict):
        return schemas.DiffRemovedItem(
            item_id=r["item_id"],
            skill_name=r["skill_name"],
            reason=r["reason"],
        )
    return schemas.DiffRemovedItem(
        item_id=r.item_id,
        skill_name=r.skill_name,
        reason=r.reason,
    )


def to_schema_diff_added(
    a: models.ItemChange | schemas.DiffAddedItem | dict[str, Any]
) -> schemas.DiffAddedItem:
    if isinstance(a, dict):
        return schemas.DiffAddedItem(
            item_id=a["item_id"],
            skill_name=a["skill_name"],
            reason=a["reason"],
        )
    return schemas.DiffAddedItem(
        item_id=a.item_id,
        skill_name=a.skill_name,
        reason=a.reason,
    )


def to_schema_diff_reordered(
    ro: models.ReorderedItem | schemas.DiffReorderedItem | dict[str, Any]
) -> schemas.DiffReorderedItem:
    if isinstance(ro, dict):
        return schemas.DiffReorderedItem(
            item_id=ro["item_id"],
            skill_name=ro["skill_name"],
            from_position=int(ro["from_position"]),
            to_position=int(ro["to_position"]),
        )
    return schemas.DiffReorderedItem(
        item_id=ro.item_id,
        skill_name=ro.skill_name,
        from_position=int(ro.from_position),
        to_position=int(ro.to_position),
    )


def to_schema_diff_reprioritized(
    rp: models.ReprioritizedItem | schemas.DiffReprioritizedSkill | dict[str, Any]
) -> schemas.DiffReprioritizedSkill:
    if isinstance(rp, dict):
        return schemas.DiffReprioritizedSkill(
            skill_id=rp["skill_id"],
            skill_name=rp["skill_name"],
            from_priority=int(round(float(rp["from_priority"]))),
            to_priority=int(round(float(rp["to_priority"]))),
        )
    return schemas.DiffReprioritizedSkill(
        skill_id=rp.skill_id,
        skill_name=rp.skill_name,
        from_priority=int(round(float(rp.from_priority))),
        to_priority=int(round(float(rp.to_priority))),
    )


def to_schema_requirement_change(
    rc: models.RequirementChange | schemas.RequirementChange | dict[str, Any]
) -> schemas.RequirementChange:
    if isinstance(rc, dict):
        from_val = rc.get("from") if "from" in rc else rc.get("from_")
        to_val = rc.get("to")
        return schemas.RequirementChange(
            skill_id=rc["skill_id"],
            skill_name=rc["skill_name"],
            change=rc["change"],
            from_=round(float(from_val), 2) if from_val is not None else None,
            to=round(float(to_val), 2) if to_val is not None else None,
        )
    return schemas.RequirementChange(
        skill_id=rc.skill_id,
        skill_name=rc.skill_name,
        change=rc.change,
        from_=round(float(rc.from_), 2) if rc.from_ is not None else None,
        to=round(float(rc.to), 2) if rc.to is not None else None,
    )


def to_schema_diff(diff: models.Diff | schemas.Diff | dict[str, Any]) -> schemas.Diff:
    if isinstance(diff, dict):
        return schemas.Diff(
            trigger=to_schema_diff_trigger(diff["trigger"]),
            readiness_before=round(float(diff["readiness_before"]), 1),
            readiness_after=round(float(diff["readiness_after"]), 1),
            level_changes=[to_schema_level_change(lc) for lc in diff.get("level_changes", [])],
            unlocked=[to_schema_skill_ref(u) for u in diff.get("unlocked", [])],
            removed=[to_schema_diff_removed(r) for r in diff.get("removed", [])],
            added=[to_schema_diff_added(a) for a in diff.get("added", [])],
            reordered=[to_schema_diff_reordered(ro) for ro in diff.get("reordered", [])],
            reprioritized=[to_schema_diff_reprioritized(rp) for rp in diff.get("reprioritized", [])],
            requirement_changes=[
                to_schema_requirement_change(rc) for rc in diff.get("requirement_changes", [])
            ],
            facts=list(diff.get("facts", [])),
        )
    return schemas.Diff(
        trigger=to_schema_diff_trigger(diff.trigger),
        readiness_before=round(float(diff.readiness_before), 1),
        readiness_after=round(float(diff.readiness_after), 1),
        level_changes=[to_schema_level_change(lc) for lc in diff.level_changes],
        unlocked=[to_schema_skill_ref(u) for u in diff.unlocked],
        removed=[to_schema_diff_removed(r) for r in diff.removed],
        added=[to_schema_diff_added(a) for a in diff.added],
        reordered=[to_schema_diff_reordered(ro) for ro in diff.reordered],
        reprioritized=[to_schema_diff_reprioritized(rp) for rp in diff.reprioritized],
        requirement_changes=[
            to_schema_requirement_change(rc) for rc in diff.requirement_changes
        ],
        facts=list(diff.facts),
    )


def to_schema_today_pick(
    tp: models.TodayPick | schemas.TodayPick | dict[str, Any] | None
) -> schemas.TodayPick | None:
    if tp is None:
        return None
    if isinstance(tp, dict):
        return schemas.TodayPick(
            item_id=tp["item_id"],
            skill_id=tp["skill_id"],
            skill_name=tp["skill_name"],
            activity=to_schema_activity(tp["activity"]),
            minutes=int(tp["minutes"]),
            why=to_schema_why(tp["why"]),  # type: ignore[arg-type]
            reasons=list(tp.get("reasons", [])),
        )
    return schemas.TodayPick(
        item_id=tp.item_id,
        skill_id=tp.skill_id,
        skill_name=tp.skill_name,
        activity=to_schema_activity(tp.activity),
        minutes=int(tp.minutes),
        why=to_schema_why(tp.why),  # type: ignore[arg-type]
        reasons=list(tp.reasons),
    )
