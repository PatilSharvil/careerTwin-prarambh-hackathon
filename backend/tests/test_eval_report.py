from __future__ import annotations

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import EvalCategory, EvalReport


REPORT_PATH = Path(__file__).resolve().parent.parent / "eval" / "report.json"


def test_eval_report_file_schema_and_math() -> None:
    assert REPORT_PATH.exists(), f"Evaluation report not found at {REPORT_PATH}. Run 'python -m eval.run_eval' first."
    
    raw = REPORT_PATH.read_text(encoding="utf-8")
    data = json.loads(raw)
    report = EvalReport.model_validate(data)

    assert report.generated_at, "generated_at timestamp must not be empty"
    
    # Mathematical integrity
    assert report.summary.total == len(report.metrics), "summary.total must match len(metrics)"
    passed_count = sum(1 for m in report.metrics if m.passed)
    assert report.summary.passed == passed_count, "summary.passed must equal count of passing metrics"
    expected_rate = round((report.summary.passed / report.summary.total) * 100.0, 1)
    assert report.summary.pass_rate == expected_rate, "summary.pass_rate math mismatch"

    # All 6 categories represented
    categories_present = {m.category for m in report.metrics}
    expected_categories: set[EvalCategory] = {
        "Skill-Gap Accuracy",
        "Personalization",
        "Roadmap Quality",
        "Adaptability",
        "Recommendation Relevance",
        "Explainability",
    }
    assert categories_present == expected_categories, f"Missing or unexpected categories: {categories_present ^ expected_categories}"
    assert len(report.metrics) == 14, "Expected exactly 14 metrics per SPEC §13.2"

    # Personas integrity
    assert len(report.personas) == 6, "Expected 6 evaluated golden personas"
    for persona in report.personas:
        assert 0.0 <= persona.precision_at_3 <= 1.0
        assert 0.0 <= persona.recall_at_3 <= 1.0

    # ADK cases check
    assert isinstance(report.adk.cases, list)


def test_get_eval_report_endpoint() -> None:
    client = TestClient(app)
    response = client.get("/api/eval/report")
    assert response.status_code == 200
    report = EvalReport.model_validate(response.json())
    assert report.summary.total == 14
    assert report.summary.pass_rate >= 90.0


def test_get_eval_report_endpoint_missing_file(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    client = TestClient(app)
    # Monkeypatch the report file path in app.main to a non-existent path
    fake_path = tmp_path / "non_existent_report.json"
    import app.main as main_module
    monkeypatch.setattr(main_module, "EVAL_REPORT_PATH", fake_path)

    response = client.get("/api/eval/report")
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "EVAL_NOT_RUN"
