import pytest

from tests.conftest import ConnectJSON

pytestmark = pytest.mark.requires_kernels

SCENARIO = {
    "site": {"lat": 0.674, "lon": 23.473},
    "range": {"start": "2027-01-01T00:00:00Z", "end": "2027-02-01T00:00:00Z", "stepMinutes": 60},
}


def test_simulate_unimplemented_until_horizon_exists(rpc: ConnectJSON) -> None:
    r = rpc.call("PowerService", "Simulate", {"scenario": SCENARIO})
    assert r.json()["code"] == "unimplemented"


def test_fixed_panel_without_azimuth_is_rejected_first(rpc: ConnectJSON) -> None:
    body = {"scenario": SCENARIO, "config": {"orientation": "PANEL_ORIENTATION_VERTICAL_FIXED"}}
    r = rpc.call("PowerService", "Simulate", body)
    assert r.status_code == 400
    assert r.json()["code"] == "invalid_argument"


@pytest.mark.usefixtures("flat_horizon")
def test_simulate_equatorial_month(rpc: ConnectJSON) -> None:
    r = rpc.call("PowerService", "Simulate", {"scenario": SCENARIO})
    assert r.status_code == 200, r.text
    body = r.json()
    n = len(body["time"])
    assert n == len(body["pGenW"]) == len(body["pLoadW"]) == len(body["socPct"]) == 745
    # Ecuador: noche lunar de ~14.8 días; 1600 Wh útiles a 60 W no alcanzan -> brownout
    assert body.get("survives", False) is False
    assert "firstBrownoutTime" in body
    assert body["minSocPct"] == pytest.approx(20.0)
