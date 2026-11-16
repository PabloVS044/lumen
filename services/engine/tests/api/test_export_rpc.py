"""ExportService + JobService a nivel RPC, con la app ASGI real y kernels SPICE reales.

Contrato de comportamiento: el export debe coincidir con lo que devuelve Analyze para la misma
petición (se contrasta con una llamada real a Analyze, sin números fijos).
"""

import base64
import csv
import io
import itertools
import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest
from lumen.v1.common_pb2 import ErrorDetail
from starlette.testclient import TestClient

from lumen_engine.db.store import InMemoryStore
from lumen_engine.main import create_app
from lumen_engine.services import analysis as analysis_service
from tests.api.test_analysis_rpc import JAN, SITE, flat_dem  # noqa: F401  (fixture compartida)
from tests.conftest import ConnectJSON

pytestmark = pytest.mark.requires_kernels

ANALYSIS = {"site": SITE, "range": JAN}


@pytest.fixture
def api(flat_dem: Path, monkeypatch: pytest.MonkeyPatch) -> ConnectJSON:  # noqa: F811
    monkeypatch.setattr(analysis_service, "DEFAULT_STORE", InMemoryStore())
    return ConnectJSON(TestClient(create_app()))


def error_code(r: Any) -> str:
    detail = r.json()["details"][0]
    return ErrorDetail.FromString(base64.b64decode(detail["value"] + "==")).code


def export(api: ConnectJSON, fmt: str, analysis: dict[str, Any] | None = None) -> Any:
    return api.call(
        "ExportService", "CreateExport", {"analysis": analysis or ANALYSIS, "format": fmt}
    )


def decode(url: str) -> tuple[str, bytes]:
    head, _, data = url.partition(",")
    assert head.endswith(";base64")
    return head.removeprefix("data:").removesuffix(";base64"), base64.b64decode(data)


def analyze_series(api: ConnectJSON) -> dict[str, Any]:
    r = api.call("AnalysisService", "Analyze", {**ANALYSIS, "options": {"includeSeries": True}})
    assert r.status_code == 200, r.text
    result: dict[str, Any] = r.json()["result"]
    return result


def csv_rows(api: ConnectJSON) -> list[dict[str, str]]:
    r = export(api, "EXPORT_FORMAT_CSV")
    assert r.status_code == 200, r.text
    _, raw = decode(r.json()["downloadUrl"])
    return list(csv.DictReader(io.StringIO(raw.decode())))


def test_csv_matches_analyze_series(api: ConnectJSON) -> None:
    series = analyze_series(api)["series"]
    rows = csv_rows(api)
    assert len(rows) == len(series["time"])
    for i in (0, len(rows) // 2, len(rows) - 1):
        row = rows[i]
        assert float(row["sun_el_deg"]) == pytest.approx(series["sun"]["elDeg"][i])
        assert float(row["sun_az_deg"]) == pytest.approx(series["sun"]["azDeg"][i])
        assert float(row["earth_el_deg"]) == pytest.approx(series["earth"]["elDeg"][i])
        assert float(row["sun_fraction"]) == pytest.approx(
            series["sun"].get("fraction", [0] * len(rows))[i]
        )
        assert float(row["horizon_at_sun_deg"]) == pytest.approx(series["horizonAtSunDeg"][i])
        assert float(row["eclipse_fraction"]) == pytest.approx(
            series.get("eclipseFraction", [0.0] * len(rows))[i]
        )
        for col, key in (
            ("sun_visible", "sunVisible"),
            ("earth_visible", "earthVisible"),
            ("operable", "operable"),
        ):
            assert row[col] == str(series.get(key, [False] * len(rows))[i]).lower()


def test_csv_timestamps_are_utc_iso_and_monotonic(api: ConnectJSON) -> None:
    times = [r["time"] for r in csv_rows(api)]
    assert all(t.endswith("Z") for t in times)
    parsed = [datetime.fromisoformat(t.replace("Z", "+00:00")) for t in times]
    assert all(a < b for a, b in itertools.pairwise(parsed))
    assert times[0] == JAN["start"]


def test_json_metrics_equal_analyze(api: ConnectJSON) -> None:
    res = analyze_series(api)
    r = export(api, "EXPORT_FORMAT_JSON")
    assert r.status_code == 200, r.text
    mime, raw = decode(r.json()["downloadUrl"])
    assert mime == "application/json"
    doc = json.loads(raw)
    assert set(doc) >= {"site", "coverage", "metrics", "events", "meta", "series"}
    assert doc["metrics"] == res["metrics"]
    assert doc["series"]["time"] == res["series"]["time"]


def test_csv_mime_and_data_url(api: ConnectJSON) -> None:
    r = export(api, "EXPORT_FORMAT_CSV")
    mime, raw = decode(r.json()["downloadUrl"])
    assert mime == "text/csv"
    assert raw.decode().splitlines()[0].startswith("time,sun_az_deg")


def test_pdf_is_rejected_with_stable_code(api: ConnectJSON) -> None:
    r = export(api, "EXPORT_FORMAT_PDF")
    assert r.status_code == 400 or r.status_code == 412
    assert r.json()["code"] == "failed_precondition"
    assert error_code(r) == "EXPORT_FORMAT_UNSUPPORTED"


def test_invalid_request_rejected_by_protovalidate(api: ConnectJSON) -> None:
    bad = {"site": {"lat": 200, "lon": 0}, "range": JAN}
    assert export(api, "EXPORT_FORMAT_CSV", bad).status_code == 400
    assert export(api, "EXPORT_FORMAT_UNSPECIFIED").status_code == 400


def test_get_job_for_export_is_done(api: ConnectJSON) -> None:
    job_id = export(api, "EXPORT_FORMAT_JSON").json()["jobId"]
    r = api.call("JobService", "GetJob", {"jobId": job_id})
    assert r.status_code == 200
    body = r.json()
    assert body["state"] == "JOB_STATE_DONE"
    assert body["progress"] == 1


def test_failed_export_registers_failed_job(
    api: ConnectJSON, monkeypatch: pytest.MonkeyPatch
) -> None:
    from lumen_engine.jobs.registry import REGISTRY

    async def boom(*_: Any, **__: Any) -> Any:
        raise RuntimeError("pipeline exploded")

    monkeypatch.setattr("lumen_engine.services.export.pipeline.analyze", boom)
    before = set(REGISTRY._jobs)
    r = export(api, "EXPORT_FORMAT_CSV")
    assert r.status_code >= 500
    (job_id,) = set(REGISTRY._jobs) - before
    got = api.call("JobService", "GetJob", {"jobId": job_id}).json()
    assert got["state"] == "JOB_STATE_FAILED"
    assert "pipeline exploded" in got["error"]


def test_unknown_job_is_404(api: ConnectJSON) -> None:
    r = api.call("JobService", "GetJob", {"jobId": "export-nope"})
    assert r.status_code == 404
    assert error_code(r) == "JOB_NOT_FOUND"


def test_search_ids_still_route_to_search(api: ConnectJSON) -> None:
    r = api.call("JobService", "GetJob", {"jobId": "search-nope"})
    assert r.status_code == 404
    assert error_code(r) == "JOB_NOT_FOUND"
    assert "Search job" in r.json()["message"]


def test_oversize_export_is_rejected(api: ConnectJSON, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("lumen_engine.services.export.MAX_PAYLOAD_BYTES", 100)
    r = export(api, "EXPORT_FORMAT_CSV")
    assert r.status_code == 429 or r.json()["code"] == "resource_exhausted"
    assert error_code(r) == "EXPORT_TOO_LARGE"
