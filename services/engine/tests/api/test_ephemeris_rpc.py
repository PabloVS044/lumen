import math

import pytest

from tests.conftest import ConnectJSON

pytestmark = pytest.mark.requires_kernels

SITE = {"lat": -89.45, "lon": 222.69}
RANGE = {"start": "2027-01-01T00:00:00Z", "end": "2027-01-02T00:00:00Z", "stepMinutes": 60}


def test_get_series(rpc: ConnectJSON) -> None:
    r = rpc.call("EphemerisService", "GetSeries", {"site": SITE, "range": RANGE})
    assert r.status_code == 200, r.text
    body = r.json()
    n = len(body["time"])
    assert n == 25
    assert body["time"][0] == "2027-01-01T00:00:00Z"
    for key in ("sun", "earth"):
        assert len(body[key]["azDeg"]) == len(body[key]["elDeg"]) == len(body[key]["distKm"]) == n


def test_get_state_returns_unit_vectors(rpc: ConnectJSON) -> None:
    r = rpc.call("EphemerisService", "GetState", {"time": "2027-01-01T00:00:00Z"})
    assert r.status_code == 200, r.text
    for key in ("sunDir", "earthDir"):
        v = r.json()[key]
        assert math.isclose(math.hypot(v["x"], v["y"], v["z"]), 1.0, rel_tol=1e-9)


def test_range_outside_kernels_is_out_of_range(rpc: ConnectJSON) -> None:
    rng = {"start": "2151-01-01T00:00:00Z", "end": "2151-01-02T00:00:00Z"}
    r = rpc.call("EphemerisService", "GetSeries", {"site": SITE, "range": rng})
    assert r.json()["code"] == "out_of_range"


def test_range_too_long_is_invalid_argument(rpc: ConnectJSON) -> None:
    rng = {"start": "2027-01-01T00:00:00Z", "end": "2029-06-01T00:00:00Z", "stepMinutes": 360}
    r = rpc.call("EphemerisService", "GetSeries", {"site": SITE, "range": rng})
    assert r.status_code == 400
    assert r.json()["code"] == "invalid_argument"


@pytest.mark.usefixtures("flat_horizon")
def test_list_events_with_horizon(rpc: ConnectJSON) -> None:
    body = {
        "site": {"lat": 0.674, "lon": 23.473},
        "from": "2027-01-01T00:00:00Z",
        "horizonDays": 40,
        "types": ["EVENT_TYPE_SUNRISE", "EVENT_TYPE_SUNSET"],
    }
    r = rpc.call("EphemerisService", "ListEvents", body)
    assert r.status_code == 200, r.text
    events = r.json()["events"]
    assert {e["type"] for e in events} == {"EVENT_TYPE_SUNRISE", "EVENT_TYPE_SUNSET"}
    times = [e["time"] for e in events]
    assert times == sorted(times)
    # Ecuador, 40 días: un amanecer y un atardecer por día lunar (~29.5 d)
    assert 2 <= len(events) <= 3
