"""Knowledge Base Data Validation Script.

Validates skills.json, roles.json, roles_v2.json, resources.json, and personas/.
"""
from __future__ import annotations

import json
import os
import sys
from collections import defaultdict, deque
from typing import Any

# Determine paths relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "data"))
PERSONAS_DIR = os.path.join(DATA_DIR, "personas")


def load_json(filepath: str) -> Any:
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"File not found: {filepath}")
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def validate_dag(skills: list[dict[str, Any]]) -> tuple[bool, int]:
    """Check if the skills prerequisites form a Directed Acyclic Graph (DAG) and return longest chain."""
    skill_ids = {s["id"] for s in skills}
    in_degree = {s["id"]: 0 for s in skills}
    adj: dict[str, list[str]] = defaultdict(list)

    for s in skills:
        sid = s["id"]
        for p in s.get("prerequisites", []):
            pskill = p["skill"]
            if pskill in skill_ids:
                adj[pskill].append(sid)
                in_degree[sid] += 1

    queue = deque([sid for sid, deg in in_degree.items() if deg == 0])
    visited_count = 0
    # Compute longest path in DAG
    dist = {s["id"]: 1 for s in skills}

    while queue:
        curr = queue.popleft()
        visited_count += 1
        for neighbor in adj[curr]:
            if dist[curr] + 1 > dist[neighbor]:
                dist[neighbor] = dist[curr] + 1
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    is_dag = (visited_count == len(skills))
    longest_chain = max(dist.values()) if dist else 0
    return is_dag, longest_chain


def validate_all() -> dict[str, Any]:
    errors: list[str] = []

    # 1. Load data
    skills = load_json(os.path.join(DATA_DIR, "skills.json"))
    roles = load_json(os.path.join(DATA_DIR, "roles.json"))
    roles_v2 = load_json(os.path.join(DATA_DIR, "roles_v2.json"))
    resources = load_json(os.path.join(DATA_DIR, "resources.json"))

    persona_files = [f for f in os.listdir(PERSONAS_DIR) if f.endswith(".json")]
    personas = [load_json(os.path.join(PERSONAS_DIR, pf)) for pf in persona_files]

    # Validate skills
    skill_ids = set()
    alias_to_skill: dict[str, str] = {}
    valid_categories = {"Foundations", "ML", "GenAI", "Deployment", "Backend", "Data"}

    for s in skills:
        sid = s.get("id")
        if not sid or not isinstance(sid, str):
            errors.append(f"Skill missing valid id: {s}")
            continue
        if sid in skill_ids:
            errors.append(f"Duplicate skill id: {sid}")
        skill_ids.add(sid)

        cat = s.get("category")
        if cat not in valid_categories:
            errors.append(f"Skill '{sid}' has invalid category: '{cat}'")

        hpl = s.get("hours_per_level")
        if not isinstance(hpl, (int, float)) or hpl <= 0:
            errors.append(f"Skill '{sid}' has invalid hours_per_level: {hpl}")

        aliases = s.get("aliases", [])
        if len(aliases) < 3 or len(aliases) > 6:
            errors.append(f"Skill '{sid}' should have 3-6 aliases, found {len(aliases)}")

        for alias in aliases:
            norm_alias = alias.strip().lower()
            if norm_alias in alias_to_skill and alias_to_skill[norm_alias] != sid:
                errors.append(f"Duplicate alias '{alias}' for skills '{alias_to_skill[norm_alias]}' and '{sid}'")
            alias_to_skill[norm_alias] = sid

        criteria = s.get("mastery_criteria", [])
        if len(criteria) < 2:
            errors.append(f"Skill '{sid}' must have at least 2 mastery criteria")

    # Validate prerequisites reference existing skills
    for s in skills:
        for p in s.get("prerequisites", []):
            pskill = p.get("skill")
            if pskill not in skill_ids:
                errors.append(f"Skill '{s['id']}' prerequisite '{pskill}' does not exist in skills.json")
            min_l = p.get("min_level")
            if not isinstance(min_l, (int, float)) or not (1 <= min_l <= 10):
                errors.append(f"Skill '{s['id']}' prereq '{pskill}' has invalid min_level: {min_l}")

    # Validate DAG
    is_dag, longest_chain = validate_dag(skills)
    if not is_dag:
        errors.append("Skill dependency graph contains a cycle!")

    # Validate roles
    role_ids = set()
    role_skills_all: set[str] = set()
    for r in roles:
        rid = r.get("role_id")
        if not rid or rid in role_ids:
            errors.append(f"Duplicate or missing role_id: {rid}")
        role_ids.add(rid)

        if r.get("version") != "2026.09":
            errors.append(f"Role '{rid}' version must be '2026.09', found '{r.get('version')}'")

        r_skills = r.get("skills", [])
        if not (15 <= len(r_skills) <= 18):
            errors.append(f"Role '{rid}' has {len(r_skills)} skills (must be 15-18)")

        for rs in r_skills:
            sk = rs.get("skill")
            if sk not in skill_ids:
                errors.append(f"Role '{rid}' references unknown skill '{sk}'")
            role_skills_all.add(sk)

            imp = rs.get("importance")
            if not isinstance(imp, (int, float)) or not (0 < imp <= 1.0):
                errors.append(f"Role '{rid}' skill '{sk}' has invalid importance: {imp}")

            target = rs.get("target")
            if not isinstance(target, (int, float)) or not (1 <= target <= 10):
                errors.append(f"Role '{rid}' skill '{sk}' has invalid target: {target}")

    # Validate roles_v2
    if isinstance(roles_v2, list):
        r2_roles = roles_v2
    else:
        r2_roles = [roles_v2]

    found_genai_v2 = False
    for r2 in r2_roles:
        if r2.get("role_id") == "genai_engineer":
            found_genai_v2 = True
            if r2.get("version") != "2026.10":
                errors.append(f"roles_v2 genai_engineer version must be '2026.10', got '{r2.get('version')}'")
            v2_skills_dict = {s["skill"]: s for s in r2.get("skills", [])}
            if "mcp" not in v2_skills_dict:
                errors.append("roles_v2 genai_engineer must include 'mcp'")
            else:
                mcp_s = v2_skills_dict["mcp"]
                if mcp_s.get("importance") != 0.6 or mcp_s.get("target") != 5:
                    errors.append(f"roles_v2 mcp must have importance 0.6 and target 5, got {mcp_s}")
            if v2_skills_dict.get("llm_evaluation", {}).get("target") != 7:
                errors.append("roles_v2 llm_evaluation target must be 7")
            role_skills_all.add("mcp")

    if not found_genai_v2:
        errors.append("roles_v2.json must contain replacement for 'genai_engineer'")

    # Validate resources
    res_ids = set()
    capstone_count = 0
    capstone_roles = set()
    valid_res_types = {"course", "project", "doc", "certification"}

    # Track skills covered by resources
    skills_with_any_res: set[str] = set()
    skills_with_course_doc: set[str] = set()
    skills_with_project: set[str] = set()
    skills_covering_level_2: set[str] = set()
    skills_covering_level_6: set[str] = set()

    for res in resources:
        resid = res.get("id")
        if not resid or resid in res_ids:
            errors.append(f"Duplicate or invalid resource id: {resid}")
        res_ids.add(resid)

        rtype = res.get("type")
        if rtype not in valid_res_types:
            errors.append(f"Resource '{resid}' invalid type: {rtype}")

        if res.get("verified") is not False:
            errors.append(f"Resource '{resid}' verified must be False initially")

        lf = res.get("level_from")
        lt = res.get("level_to")
        if not isinstance(lf, (int, float)) or not isinstance(lt, (int, float)) or lf < 0 or lt > 10 or lf > lt:
            errors.append(f"Resource '{resid}' invalid level band: [{lf}, {lt}]")

        hrs = res.get("hours")
        if not isinstance(hrs, (int, float)) or hrs <= 0:
            errors.append(f"Resource '{resid}' invalid hours: {hrs}")

        gain = res.get("level_gain")
        if not isinstance(gain, (int, float)) or gain <= 0:
            errors.append(f"Resource '{resid}' invalid level_gain: {gain}")

        cap = res.get("capstone_for")
        if cap:
            capstone_count += 1
            capstone_roles.add(cap)
            if cap not in role_ids:
                errors.append(f"Resource '{resid}' capstone_for unknown role: {cap}")

        r_skills = res.get("skills", [])
        if not r_skills:
            errors.append(f"Resource '{resid}' has no skills associated")

        for sk in r_skills:
            if sk not in skill_ids:
                errors.append(f"Resource '{resid}' references unknown skill: {sk}")
            skills_with_any_res.add(sk)
            if rtype in {"course", "doc"}:
                skills_with_course_doc.add(sk)
            if rtype == "project":
                skills_with_project.add(sk)
            if lf <= 2 <= lt:
                skills_covering_level_2.add(sk)
            if lf <= 6 <= lt:
                skills_covering_level_6.add(sk)

    if capstone_count != 4:
        errors.append(f"Must have exactly 4 capstone projects, found {capstone_count}")

    if not (80 <= len(resources) <= 100):
        errors.append(f"Resource count must be between 80 and 100, found {len(resources)}")

    # Check for role skills coverage
    for rsk in role_skills_all:
        if rsk not in skills_with_any_res:
            errors.append(f"Role skill '{rsk}' has no resources")
        if rsk not in skills_with_course_doc:
            errors.append(f"Role skill '{rsk}' missing course/doc resource")
        if rsk not in skills_with_project:
            errors.append(f"Role skill '{rsk}' missing project resource")
        if rsk not in skills_covering_level_2:
            errors.append(f"Role skill '{rsk}' not covered at level 2")
        if rsk not in skills_covering_level_6:
            errors.append(f"Role skill '{rsk}' not covered at level 6")

    # Validate personas
    if len(personas) != 6:
        errors.append(f"Expected exactly 6 personas, found {len(personas)}")

    persona_ids = set()
    found_empty_gap = False

    for p in personas:
        pid = p.get("persona_id")
        if not pid or pid in persona_ids:
            errors.append(f"Duplicate or invalid persona_id: {pid}")
        persona_ids.add(pid)

        rid = p.get("role_id")
        if rid not in role_ids:
            errors.append(f"Persona '{pid}' references unknown role: {rid}")

        pskills = p.get("skills", [])
        for psk in pskills:
            sk_id = psk.get("skill_id")
            if sk_id not in skill_ids:
                errors.append(f"Persona '{pid}' references unknown skill: {sk_id}")

        top_gaps = p.get("expected_top_gaps", [])
        if len(top_gaps) == 0:
            found_empty_gap = True
        else:
            if not (3 <= len(top_gaps) <= 5):
                errors.append(f"Persona '{pid}' expected_top_gaps must have 3-5 items (or 0 for empty gap), found {len(top_gaps)}")
            for tg in top_gaps:
                if tg not in skill_ids:
                    errors.append(f"Persona '{pid}' expected_top_gaps references unknown skill: {tg}")

    if not found_empty_gap:
        errors.append("Must include at least one empty-gap persona (expected_top_gaps: [])")

    # Calculate skills with no resources
    skills_with_no_res = sorted(list(skill_ids - skills_with_any_res))

    return {
        "errors": errors,
        "num_skills": len(skills),
        "num_roles": len(roles),
        "num_resources": len(resources),
        "num_personas": len(personas),
        "longest_chain": longest_chain,
        "skills_with_no_resources": skills_with_no_res,
    }


def main():
    report = validate_all()
    print(f"Number of skills: {report['num_skills']}")
    print(f"Number of roles: {report['num_roles']}")
    print(f"Number of resources: {report['num_resources']}")
    print(f"Number of personas: {report['num_personas']}")
    print(f"Longest prerequisite chain: {report['longest_chain']}")

    no_res_str = ", ".join(report['skills_with_no_resources'])
    print(f"Skills with no resources: {no_res_str}")

    if report["errors"]:
        print(f"\nVALIDATION FAILED with {len(report['errors'])} errors:")
        for err in report["errors"]:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\nAll data validation checks passed successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
