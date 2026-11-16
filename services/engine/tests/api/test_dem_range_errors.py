"""Errores por cobertura insuficiente del DEM, con el DEM real (QA: Malapert -86°, polar 80 m)."""

from typing import Any

import pytest

from tests.conftest import ConnectJSON

pytestmark = [pytest.mark.requires_kernels, pytest.mark.requires_dem]

RANGE = {"start": "2027-01-01T00:00:00Z", "end": "2027-01-08T00:00:00Z", "stepMinutes": 60}
RIDGE = {"lat": -89.4403, "lon": -137.134}  # cubierto por Site01 y por el polar de 80 m
MALAPERT = {"lat": -86.0, "lon": 0.0}  # el DEM polar solo llega a -80°: los rayos no alcanzan


def _code(body: dict[str, Any]) -> str:
    return str(body["details"][0]["debug"]["code"])


def test_insufficient_dem_range_is_a_failed_precondition(rpc: ConnectJSON) -> None:
    r = rpc.call("HorizonService", "ComputeHorizon", {"site": MALAPERT})
    assert r.status_code == 400  # Connect: failed_precondition se sirve como HTTP 400
    body = r.json()
    assert body["code"] == "failed_precondition"
    assert _code(body) == "INSUFFICIENT_DEM_RANGE"


def test_analyze_reports_the_same_precondition(rpc: ConnectJSON) -> None:
    r = rpc.call("AnalysisService", "Analyze", {"site": MALAPERT, "range": RANGE})
    assert r.json()["code"] == "failed_precondition"


def test_compare_names_the_scenario_that_failed(rpc: ConnectJSON) -> None:
    scenarios = [{"site": RIDGE, "range": RANGE}, {"site": MALAPERT, "range": RANGE}]
    r = rpc.call("AnalysisService", "Compare", {"scenarios": scenarios})
    body = r.json()
    assert body["code"] == "failed_precondition"
    debug = body["details"][0]["debug"]
    assert debug["code"] == "INSUFFICIENT_DEM_RANGE"
    assert debug["context"]["scenario"] == "1"  # índice base 0 del escenario que falló


def test_compare_still_succeeds_when_every_scenario_is_covered(rpc: ConnectJSON) -> None:
    scenarios = [{"site": RIDGE, "range": RANGE}, {"site": RIDGE, "range": RANGE}]
    r = rpc.call("AnalysisService", "Compare", {"scenarios": scenarios})
    assert r.status_code == 200
    assert len(r.json()["results"]) == 2
