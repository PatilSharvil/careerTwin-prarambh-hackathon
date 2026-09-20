"""Tests for CareerTwin Curated Knowledge Base.

Verifies schemas, integrity, DAG acyclicity, resource coverage, and personas.
"""
from scripts.validate_data import validate_all


def test_knowledge_base_data_integrity():
    report = validate_all()
    assert len(report["errors"]) == 0, f"Knowledge base validation errors: {report['errors']}"
    assert report["num_skills"] >= 60
    assert report["num_roles"] == 4
    assert 80 <= report["num_resources"] <= 100
    assert report["num_personas"] == 6
    assert len(report["skills_with_no_resources"]) == 0
    assert report["longest_chain"] >= 5
