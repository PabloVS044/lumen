import json

import pytest

from tests.validation.tools.build_report import REPORT, build

pytestmark = pytest.mark.requires_kernels


def test_published_report_matches_current_engine() -> None:
    """Si cambia el motor o los fixtures: uv run python -m tests.validation.tools.build_report"""
    committed = json.loads(REPORT.read_text(encoding="utf-8"))["checks"]
    fresh = build()
    assert [c["id"] for c in committed] == [c["id"] for c in fresh]
    for old, new in zip(committed, fresh, strict=True):
        assert old["passed"] == new["passed"]
        assert old["max_error"] == pytest.approx(new["max_error"], rel=1e-2, abs=1e-12)


def test_all_published_checks_pass() -> None:
    checks = json.loads(REPORT.read_text(encoding="utf-8"))["checks"]
    assert all(c["passed"] for c in checks)
