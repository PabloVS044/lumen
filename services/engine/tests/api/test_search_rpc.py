"""Ciclo Connect del trabajo asíncrono de M12, sin datos externos."""

import time
from typing import Any

import pytest
from lumen.v1 import search_pb2

from lumen_engine.search import jobs as search_jobs
from lumen_engine.services import search as search_service
from tests.conftest import ConnectJSON


def test_search_job_lifecycle(rpc: ConnectJSON, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(search_service, "sample_height", lambda lat, lon: (0.0, None))

    async def fake_run_spice(fn: Any, *args: Any, **kwargs: Any) -> object:
        return object()

    def fake_search(req: Any, eph: Any, progress: Any) -> search_pb2.GetBestSpotResultResponse:
        progress(0.5, "horizon")
        return search_pb2.GetBestSpotResultResponse(grid_cols=1, grid_rows=1, grid_values=[1.0])

    monkeypatch.setattr(search_service, "run_spice", fake_run_spice)
    monkeypatch.setattr(search_jobs, "run", fake_search)
    body = {
        "center": {"lat": -89.45, "lon": -137.31},
        "radiusKm": 0.5,
        "spacingM": 500,
        "maxSlopeDeg": 15,
        "range": {"start": "2027-01-01T00:00:00Z", "end": "2027-01-02T00:00:00Z"},
        "objective": "illumination_pct",
        "topK": 1,
    }
    created = rpc.call("SearchService", "FindBestSpot", body)
    assert created.status_code == 200, created.text
    job_id = created.json()["job"]["jobId"]
    assert job_id.startswith("search-")
    for _ in range(100):
        status = rpc.call("JobService", "GetJob", {"jobId": job_id})
        if status.json()["state"] == "JOB_STATE_DONE":
            break
        time.sleep(0.01)
    assert status.json()["state"] == "JOB_STATE_DONE"
    result = rpc.call("SearchService", "GetBestSpotResult", {"jobId": job_id})
    assert result.status_code == 200, result.text
    assert result.json()["gridValues"] == [1.0]
