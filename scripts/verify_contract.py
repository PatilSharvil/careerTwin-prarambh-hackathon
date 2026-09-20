#!/usr/bin/env python3
"""Contract verification runner per SPEC §10 and Phase I1.

Runs the full flow against a RUNNING server (BASE_URL env, default http://localhost:8000/api):
  1. GET  /health
  2. GET  /roles
  3. POST /roles/custom       (SKIPPED if 501 NOT_IMPLEMENTED)
  4. POST /profile
  5. GET  /profile
  6. POST /analyze
  7. GET  /roadmap
  8. GET  /today
  9. POST /progress/complete
 10. POST /progress/known
 11. POST /market/update
 12. POST /coach              (SKIPPED if 501 NOT_IMPLEMENTED)
 13. GET  /eval/report        (SKIPPED if 404 EVAL_NOT_RUN or 501)

Validates every active response against app.schemas (Pydantic models).
Prints a PASS/FAIL/SKIPPED table per endpoint with schema validation details.
Saves one real response per passing endpoint into docs/sample_responses/<endpoint>.json.
Exits 0 if all implemented endpoints pass, non-zero if any endpoint fails.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import requests
from pydantic import BaseModel, ValidationError

# Resolve repository root and backend directory for schema imports
def find_repo_root() -> Path:
    p = Path(__file__).resolve()
    for parent in [p] + list(p.parents):
        if (parent / "docs").exists() and (parent / "README.md").exists():
            return parent
    return Path.cwd()


REPO_ROOT = find_repo_root()
BACKEND_DIR = REPO_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from app.schemas import (
        AnalyzeResponse,
        CoachResponse,
        CustomRoleResponse,
        EvalReport,
        Health,
        ProfileResponse,
        ProgressResponse,
        RolesResponse,
        TodayResponse,
    )
except ImportError as err:
    print(f"[FATAL] Failed to import app.schemas from {BACKEND_DIR}: {err}")
    sys.exit(1)


@dataclass
class CheckResult:
    endpoint: str
    method: str
    status_code: int
    verdict: str  # PASS, FAIL, SKIPPED
    details: str
    response_data: Any = None
    sample_filename: str | None = None


def run_contract_verification(base_url: str) -> list[CheckResult]:
    session = requests.Session()
    session.headers.update({"X-User-Id": "verify_contract_user"})
    results: list[CheckResult] = []

    sample_dir = REPO_ROOT / "docs" / "sample_responses"
    sample_dir.mkdir(parents=True, exist_ok=True)

    def record_check(
        endpoint_name: str,
        method: str,
        path: str,
        expected_schema: type[BaseModel] | None,
        sample_filename: str | None,
        execute_fn: Callable[[], requests.Response],
        can_skip_codes: tuple[int, ...] = (501,),
        skip_error_codes: tuple[str, ...] = ("NOT_IMPLEMENTED", "EVAL_NOT_RUN"),
    ) -> None:
        url = f"{base_url}{path}"
        try:
            res = execute_fn()
        except requests.RequestException as req_err:
            results.append(
                CheckResult(
                    endpoint=f"{method} {path}",
                    method=method,
                    status_code=0,
                    verdict="FAIL",
                    details=f"Network error: {req_err}",
                )
            )
            return

        status_code = res.status_code
        try:
            data = res.json()
        except Exception:
            data = None

        # Check for expected skipped statuses (e.g. 501 NOT_IMPLEMENTED, 404 EVAL_NOT_RUN)
        if status_code in can_skip_codes or (
            isinstance(data, dict)
            and data.get("error", {}).get("code") in skip_error_codes
        ):
            err_code = (
                data.get("error", {}).get("code")
                if isinstance(data, dict) and "error" in data
                else f"HTTP {status_code}"
            )
            results.append(
                CheckResult(
                    endpoint=f"{method} {path}",
                    method=method,
                    status_code=status_code,
                    verdict="SKIPPED",
                    details=f"Endpoint not yet implemented or run ({err_code})",
                    response_data=data,
                )
            )
            return

        if status_code != 200:
            err_detail = res.text[:200]
            results.append(
                CheckResult(
                    endpoint=f"{method} {path}",
                    method=method,
                    status_code=status_code,
                    verdict="FAIL",
                    details=f"Expected HTTP 200, got {status_code}: {err_detail}",
                    response_data=data,
                )
            )
            return

        # Validate with Pydantic schema
        if expected_schema is not None:
            try:
                expected_schema.model_validate(data)
            except ValidationError as val_err:
                err_loc = ".".join(str(loc) for loc in val_err.errors()[0]["loc"])
                err_msg = val_err.errors()[0]["msg"]
                first_err = f"{err_loc}: {err_msg}"
                results.append(
                    CheckResult(
                        endpoint=f"{method} {path}",
                        method=method,
                        status_code=status_code,
                        verdict="FAIL",
                        details=f"Schema validation error: {first_err}",
                        response_data=data,
                    )
                )
                return

        # Passed
        results.append(
            CheckResult(
                endpoint=f"{method} {path}",
                method=method,
                status_code=status_code,
                verdict="PASS",
                details="Schema valid",
                response_data=data,
                sample_filename=sample_filename,
            )
        )

        # Write sample response
        if sample_filename and data is not None:
            target_path = sample_dir / sample_filename
            with open(target_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)

    print(f">>> Connecting to CareerTwin server at: {base_url} <<<\n")

    # 1. GET /health
    record_check(
        endpoint_name="Health",
        method="GET",
        path="/health",
        expected_schema=Health,
        sample_filename="health.json",
        execute_fn=lambda: session.get(f"{base_url}/health", timeout=30),
    )

    # 2. GET /roles
    record_check(
        endpoint_name="Roles",
        method="GET",
        path="/roles",
        expected_schema=RolesResponse,
        sample_filename="roles.json",
        execute_fn=lambda: session.get(f"{base_url}/roles", timeout=30),
    )

    # 3. POST /roles/custom
    record_check(
        endpoint_name="Custom Role",
        method="POST",
        path="/roles/custom",
        expected_schema=CustomRoleResponse,
        sample_filename="roles_custom.json",
        can_skip_codes=(501,),
        skip_error_codes=("NOT_IMPLEMENTED",),
        execute_fn=lambda: session.post(
            f"{base_url}/roles/custom",
            json={
                "title": "Robotics Vision Engineer",
                "description": "Design computer vision systems for autonomous robotic agents",
            },
            timeout=30,
        ),
    )

    # 4. POST /profile
    profile_payload = {
        "education": {"degree": "B.S. Computer Science", "year": 2022},
        "experience_years": 3.0,
        "interests": ["Agents", "LLMs", "RAG"],
        "self_skills": [
            {"name": "Python", "self": 8.0},
            {"name": "PyTorch", "self": 6.0},
            {"name": "Git", "self": 7.0},
        ],
        "resume_text": (
            "Alex Chen\n"
            "Software Engineer with 3 years experience in Python, PyTorch, LangChain, and RAG pipelines.\n"
            "Built agentic workflows and semantic search systems with ChromaDB and vector embeddings."
        ),
    }
    record_check(
        endpoint_name="Create Profile",
        method="POST",
        path="/profile",
        expected_schema=ProfileResponse,
        sample_filename="profile.json",
        execute_fn=lambda: session.post(
            f"{base_url}/profile",
            data={"data": json.dumps(profile_payload)},
            timeout=60,
        ),
    )

    # 5. GET /profile
    record_check(
        endpoint_name="Get Profile",
        method="GET",
        path="/profile",
        expected_schema=ProfileResponse,
        sample_filename=None,  # profile.json written from POST
        execute_fn=lambda: session.get(f"{base_url}/profile", timeout=30),
    )

    # 6. POST /analyze
    analyze_payload = {
        "role_id": "genai_engineer",
        "weekly_hours": 10.0,
        "deadline_weeks": 12,
    }
    record_check(
        endpoint_name="Analyze",
        method="POST",
        path="/analyze",
        expected_schema=AnalyzeResponse,
        sample_filename="analyze.json",
        execute_fn=lambda: session.post(
            f"{base_url}/analyze",
            json=analyze_payload,
            timeout=60,
        ),
    )

    # 7. GET /roadmap
    record_check(
        endpoint_name="Roadmap",
        method="GET",
        path="/roadmap",
        expected_schema=AnalyzeResponse,
        sample_filename="roadmap.json",
        execute_fn=lambda: session.get(f"{base_url}/roadmap", timeout=30),
    )

    # 8. GET /today
    record_check(
        endpoint_name="Today",
        method="GET",
        path="/today",
        expected_schema=TodayResponse,
        sample_filename="today.json",
        execute_fn=lambda: session.get(f"{base_url}/today", timeout=60),
    )

    # 9. POST /progress/complete
    record_check(
        endpoint_name="Complete Progress",
        method="POST",
        path="/progress/complete",
        expected_schema=ProgressResponse,
        sample_filename="progress_complete.json",
        execute_fn=lambda: session.post(
            f"{base_url}/progress/complete",
            json={"skill_id": "rag"},
            timeout=60,
        ),
    )

    # 10. POST /progress/known
    record_check(
        endpoint_name="Mark Known",
        method="POST",
        path="/progress/known",
        expected_schema=ProgressResponse,
        sample_filename="progress_known.json",
        execute_fn=lambda: session.post(
            f"{base_url}/progress/known",
            json={"skill_id": "python", "level": 9.0},
            timeout=60,
        ),
    )

    # 11. POST /market/update
    record_check(
        endpoint_name="Market Update",
        method="POST",
        path="/market/update",
        expected_schema=ProgressResponse,
        sample_filename="market_update.json",
        execute_fn=lambda: session.post(
            f"{base_url}/market/update",
            json={"role_id": "genai_engineer"},
            timeout=60,
        ),
    )

    # 12. POST /coach
    record_check(
        endpoint_name="Coach",
        method="POST",
        path="/coach",
        expected_schema=CoachResponse,
        sample_filename="coach.json",
        can_skip_codes=(501,),
        skip_error_codes=("NOT_IMPLEMENTED",),
        execute_fn=lambda: session.post(
            f"{base_url}/coach",
            json={"message": "What should I do today?", "session_id": "sess_demo"},
            timeout=60,
        ),
    )

    # 13. GET /eval/report
    record_check(
        endpoint_name="Eval Report",
        method="GET",
        path="/eval/report",
        expected_schema=EvalReport,
        sample_filename="eval_report.json",
        can_skip_codes=(404, 501),
        skip_error_codes=("EVAL_NOT_RUN", "NOT_IMPLEMENTED"),
        execute_fn=lambda: session.get(f"{base_url}/eval/report", timeout=30),
    )

    return results


def print_table(results: list[CheckResult]) -> bool:
    print("-" * 96)
    print(f"{'ENDPOINT':<28} | {'HTTP':<6} | {'RESULT':<8} | {'DETAILS'}")
    print("-" * 96)

    all_passed = True
    pass_count = 0
    skip_count = 0
    fail_count = 0

    for r in results:
        if r.verdict == "PASS":
            pass_count += 1
            badge = "PASS"
        elif r.verdict == "SKIPPED":
            skip_count += 1
            badge = "SKIPPED"
        else:
            fail_count += 1
            all_passed = False
            badge = "FAIL"

        http_str = str(r.status_code) if r.status_code > 0 else "ERR"
        print(f"{r.endpoint:<28} | {http_str:<6} | {badge:<8} | {r.details}")

    print("-" * 96)
    print(f"Summary: {pass_count} PASSED, {skip_count} SKIPPED, {fail_count} FAILED out of {len(results)} endpoints.")
    print("-" * 96)

    return all_passed


def main() -> None:
    base_url = os.environ.get("BASE_URL", "http://localhost:8000/api").rstrip("/")
    try:
        results = run_contract_verification(base_url)
    except Exception as exc:
        print(f"\n[FATAL] Error running contract verification: {exc}")
        sys.exit(1)

    success = print_table(results)
    if not success:
        print("\n[FAILED] One or more endpoints failed schema verification.")
        sys.exit(1)

    print("\n[SUCCESS] Contract verification passed! All endpoints conform to app.schemas.")
    sys.exit(0)


if __name__ == "__main__":
    main()
