"""Evaluation runner script per SPEC §13 and §10.2.

Executes all golden personas through the deterministic engine + ChromaDB provider,
computes every metric across the 6 judging categories, and writes backend/eval/report.json.

Optionally runs `adk eval` on Gemini when `--adk` is specified.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Ensure backend root is on sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from app.config import settings
from app.schemas import AdkEval, AdkEvalCase, EvalReport, EvalSummary
from engine.catalog import Catalog
from eval.metrics import evaluate_all_metrics
from rag.retriever import ChromaResourceProvider

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("careertwin.eval")


def parse_adk_results(raw_output: str, history_dir: Path | None = None) -> AdkEval:
    """Best-effort parser for ADK eval results from console output and eval history files."""
    now_iso = datetime.now(timezone.utc).isoformat()
    tool_traj_avg: float | None = None
    resp_match_avg: float | None = None
    cases: list[AdkEvalCase] = []

    # 1. Try to read from latest JSON file in .adk/eval_history
    if history_dir and history_dir.exists():
        json_files = sorted(history_dir.glob("*.evalset_result.json"), key=os.path.getmtime)
        if json_files:
            try:
                with open(json_files[-1], "r", encoding="utf-8") as f:
                    data = json.load(f)
                case_results = data.get("eval_case_results", [])
                for cr in case_results:
                    eid = cr.get("eval_id")
                    if not eid:
                        continue
                    status_str = str(cr.get("final_eval_status", "")).upper()
                    passed = "PASSED" in status_str or "SUCCESS" in status_str

                    # Check tool trajectory score if available
                    traj_val = None
                    metric_results = cr.get("eval_metric_results", {})
                    if isinstance(metric_results, dict):
                        for m_name, m_data in metric_results.items():
                            if "trajectory" in m_name.lower() and isinstance(m_data, dict):
                                traj_val = m_data.get("score")

                    cases.append(
                        AdkEvalCase(
                            eval_id=eid,
                            passed=passed,
                            tool_trajectory=traj_val,
                        )
                    )
            except Exception as exc:
                logger.warning("Failed parsing ADK eval history json: %s", exc)

    # 2. Try parsing console output for aggregate summary scores
    traj_match = re.search(r"tool_trajectory_avg_score\s*[:=]\s*([\d\.]+)", raw_output, re.IGNORECASE)
    if traj_match:
        try:
            tool_traj_avg = float(traj_match.group(1))
        except ValueError:
            pass

    resp_match = re.search(r"response_match_score\s*[:=]\s*([\d\.]+)", raw_output, re.IGNORECASE)
    if resp_match:
        try:
            resp_match_avg = float(resp_match.group(1))
        except ValueError:
            pass

    # If cases weren't extracted from json, try parsing from stdout table
    if not cases:
        for line in raw_output.splitlines():
            m = re.search(r"(eval_\w+)\s+(PASSED|FAILED|SUCCESS)", line, re.IGNORECASE)
            if m:
                cid, cstatus = m.group(1), m.group(2).upper()
                cases.append(AdkEvalCase(eval_id=cid, passed=(cstatus in {"PASSED", "SUCCESS"})))

    return AdkEval(
        ran_at=now_iso,
        tool_trajectory_avg_score=tool_traj_avg,
        response_match_score=resp_match_avg,
        cases=cases,
    )


def run_adk_eval() -> AdkEval:
    """Execute `adk eval` CLI command and capture raw output."""
    raw_file = backend_root / "eval" / "adk_raw.txt"
    history_dir = backend_root / "agents" / "navigator" / ".adk" / "eval_history"

    cmd = [
        sys.executable,
        "-m",
        "google.adk.cli",
        "eval",
        "agents/navigator",
        "agents/evalsets/coach.evalset.json",
        "--config_file_path",
        "agents/evalsets/test_config.json",
        "--print_detailed_results",
    ]

    logger.info("Running ADK evaluation: %s", " ".join(cmd))
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(backend_root),
            capture_output=True,
            text=True,
            timeout=180,
        )
        output_text = f"=== STDOUT ===\n{proc.stdout}\n=== STDERR ===\n{proc.stderr}"
    except Exception as exc:
        output_text = f"ADK evaluation execution failed: {exc}"

    with open(raw_file, "w", encoding="utf-8") as f:
        f.write(output_text)

    return parse_adk_results(output_text, history_dir=history_dir)


def print_metrics_table(report: EvalReport) -> None:
    """Print a clean ASCII summary table of the evaluation results."""
    print("\n" + "=" * 92)
    print(f"CAREERTWIN EVALUATION HARNESS REPORT -- {report.generated_at}")
    print("=" * 92)
    print(f"{'CATEGORY':<26} | {'METRIC':<36} | {'TARGET':<10} | {'VALUE':<8} | {'RESULT'}")
    print("-" * 92)

    for m in report.metrics:
        res_str = "PASS" if m.passed else "FAIL"
        target_display = f"{m.comparator} {m.target}"
        if m.unit == "percent":
            val_display = f"{m.value:.1f}%"
            target_display = f"{m.comparator} {m.target:.0f}%"
        elif m.unit == "ratio":
            val_display = f"{m.value:.2f}"
        else:
            val_display = f"{int(m.value)}"

        print(f"{m.category:<26} | {m.name:<36} | {target_display:<10} | {val_display:<8} | [{res_str}]")

    print("-" * 92)
    print(f"SUMMARY: {report.summary.passed}/{report.summary.total} Metrics Passed ({report.summary.pass_rate:.1f}% Pass Rate)")

    if report.personas:
        print("\n" + "-" * 92)
        print(f"{'PERSONA':<42} | {'TARGET ROLE':<16} | {'P@3':<8} | {'R@3':<8}")
        print("-" * 92)
        for p in report.personas:
            print(f"{p.name[:40]:<42} | {p.role_id:<16} | {p.precision_at_3:<8.2f} | {p.recall_at_3:<8.2f}")

    if report.adk and report.adk.ran_at:
        print("\n" + "-" * 92)
        print(f"ADK EVALUATION: {len(report.adk.cases)} Cases Evaluated at {report.adk.ran_at}")
        if report.adk.tool_trajectory_avg_score is not None:
            print(f"Tool Trajectory Avg Score: {report.adk.tool_trajectory_avg_score}")
        for c in report.adk.cases:
            res_c = "PASS" if c.passed else "FAIL"
            print(f"  - {c.eval_id}: [{res_c}]")
    print("=" * 92 + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run CareerTwin evaluation harness.")
    parser.add_argument("--adk", action="store_true", help="Run ADK evaluation on Gemini model.")
    args = parser.parse_args()

    # Enforce deterministic engine evaluation
    os.environ["LLM_PROVIDER_CHAIN"] = "none"
    settings.LLM_PROVIDER_CHAIN = "none"

    logger.info("Initializing Catalog and Chroma resource provider...")
    catalog = Catalog.from_data_dir()
    provider = ChromaResourceProvider()

    logger.info("Running evaluation metrics across all golden personas...")
    metrics, personas = evaluate_all_metrics(catalog=catalog, resource_provider=provider)

    total = len(metrics)
    passed = sum(1 for m in metrics if m.passed)
    pass_rate = round((passed / total) * 100.0, 1) if total > 0 else 0.0

    adk_eval = AdkEval(cases=[])
    if args.adk:
        logger.info("Executing --adk evaluation...")
        adk_eval = run_adk_eval()

    report = EvalReport(
        generated_at=datetime.now(timezone.utc).isoformat(),
        summary=EvalSummary(
            total=total,
            passed=passed,
            pass_rate=pass_rate,
        ),
        metrics=metrics,
        personas=personas,
        adk=adk_eval,
    )

    out_file = backend_root / "eval" / "report.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(report.model_dump_json(indent=2))

    logger.info("Wrote evaluation report to %s", out_file)
    print_metrics_table(report)

    # Return non-zero exit code if any metric failed
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
