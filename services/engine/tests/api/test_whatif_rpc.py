import base64

import pytest
from lumen.v1.common_pb2 import ErrorDetail

from lumen_engine.core.errors import NoCoverageError
from lumen_engine.dem import coverage as dem_coverage
from tests.conftest import ConnectJSON

pytestmark = pytest.mark.requires_kernels

BASE = {
    "site": {"lat": 0.674, "lon": 23.473},
    "nominalLanding": "2027-01-01T00:00:00Z",
    "maxDelayDays": 30,
    "missionDurationDays": 14,
}


def test_evaluate_reports_no_dem_coverage_for_equatorial_site(
    rpc: ConnectJSON, monkeypatch: pytest.MonkeyPatch
) -> None:
    def no_coverage(lat: float, lon: float) -> None:
        raise NoCoverageError(lat, lon)

    monkeypatch.setattr(dem_coverage, "require_coverage", no_coverage)
    r = rpc.call("WhatIfService", "Evaluate", BASE)
    assert r.json()["code"] == "failed_precondition"
    assert (
        ErrorDetail.FromString(base64.b64decode(r.json()["details"][0]["value"])).code
        == "NO_COVERAGE"
    )


def test_unknown_metric_is_rejected_before_computing(rpc: ConnectJSON) -> None:
    r = rpc.call("WhatIfService", "Evaluate", {**BASE, "metrics": ["nope"]})
    assert r.status_code == 400
    assert r.json()["code"] == "invalid_argument"


@pytest.mark.usefixtures("flat_horizon")
def test_evaluate_with_power(rpc: ConnectJSON) -> None:
    # En el ecuador el Sol pasa cerca del cénit: un panel vertical (default, pensado para los polos)
    # casi no genera. Se usa un panel horizontal.
    power = {"orientation": "PANEL_ORIENTATION_HORIZONTAL"}
    r = rpc.call("WhatIfService", "Evaluate", {**BASE, "power": power})
    assert r.status_code == 200, r.text
    body = r.json()
    points = body["points"]
    assert len(points) == 31  # retrasos 0..30 días, paso por defecto 24 h
    assert set(points[0]["metrics"]) == {"illumination_pct", "longest_dark_h", "operable_pct"}
    assert points[1]["landing"] == "2027-01-02T00:00:00Z"
    assert all("survives" in p for p in points)
    # Con 13 días de retraso la misión de 14 días cae entera en el día lunar
    best = points[13]
    assert best["metrics"]["illumination_pct"] == pytest.approx(100.0)
    assert best["survives"] is True
    assert 13 * 24 in body["recommendedDelaysHours"]
