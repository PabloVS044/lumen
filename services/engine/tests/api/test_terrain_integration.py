"""Integración R3 × R2: RPCs de visibilidad con el horizonte real del DEM LOLA (Site01).

Requiere `data/scripts/prepare_dem.py` (≈312 MB, no se descarga en CI) y los kernels SPICE.
"""

import pytest

from lumen_engine.ephem.terrain import site_terrain_height_m
from tests.conftest import ConnectJSON

pytestmark = [pytest.mark.requires_dem, pytest.mark.requires_kernels, pytest.mark.slow]

# PGDA Site01 "Connecting ridge" (coordenadas aproximadas del catálogo, cubiertas por el DEM 5 m)
SITE = {"lat": -89.45, "lon": -137.31}
START = "2027-01-01T00:00:00Z"


def test_site_has_real_terrain_height() -> None:
    h = site_terrain_height_m(SITE["lat"], SITE["lon"])
    assert h != 0.0
    assert -5_000 < h < 5_000  # rango de alturas del polo sur respecto a la esfera de 1737.4 km


def test_get_series_uses_terrain(rpc: ConnectJSON) -> None:
    rng = {"start": START, "end": "2027-01-02T00:00:00Z", "stepMinutes": 60}
    r = rpc.call("EphemerisService", "GetSeries", {"site": SITE, "range": rng})
    assert r.status_code == 200, r.text
    assert len(r.json()["time"]) == 25


def test_list_events_with_real_horizon(rpc: ConnectJSON) -> None:
    body = {"site": SITE, "from": START, "horizonDays": 60}
    r = rpc.call("EphemerisService", "ListEvents", body)
    assert r.status_code == 200, r.text
    events = r.json().get("events", [])
    times = [e["time"] for e in events]
    assert times == sorted(times)
    # En la cresta polar la Tierra sube y baja con la libración (~27 d): hay earthrise/earthset
    kinds = {e["type"] for e in events}
    assert kinds & {"EVENT_TYPE_EARTHRISE", "EVENT_TYPE_EARTHSET"}


def test_simulate_with_real_horizon(rpc: ConnectJSON) -> None:
    scenario = {
        "site": SITE,
        "range": {"start": START, "end": "2027-01-31T00:00:00Z", "stepMinutes": 60},
    }
    r = rpc.call("PowerService", "Simulate", {"scenario": scenario})
    assert r.status_code == 200, r.text
    body = r.json()
    soc = body["socPct"]
    assert len(soc) == len(body["time"]) == len(body["pGenW"])
    assert min(soc) >= 20.0 - 1e-6 and max(soc) <= 100.0 + 1e-6


def test_whatif_with_real_horizon(rpc: ConnectJSON) -> None:
    body = {"site": SITE, "nominalLanding": START, "maxDelayDays": 10, "missionDurationDays": 7}
    r = rpc.call("WhatIfService", "Evaluate", body)
    assert r.status_code == 200, r.text
    points = r.json()["points"]
    assert len(points) == 11
    for p in points:
        assert 0.0 <= p["metrics"].get("illumination_pct", 0.0) <= 100.0


def test_ridge_crest_is_far_better_lit_than_nearby_slope() -> None:
    """Sección 2.3 / 18.3: unos cientos de metros cambian drásticamente la iluminación.

    La coordenada del catálogo (aproximada) cae en una ladera de ~9°; a 300 m está la cresta (punto
    más alto en 2 km del DEM 5 m). En 2027 la cresta recibe ~85 % de luz, en el orden de lo
    publicado para la Connecting ridge (Mazarico et al. 2011); la ladera, ~53 %.
    """
    from datetime import UTC, datetime

    from google.protobuf.timestamp_pb2 import Timestamp
    from lumen.v1 import common_pb2

    from lumen_engine.visibility.site import site_visibility

    s, e = Timestamp(), Timestamp()
    s.FromDatetime(datetime(2027, 1, 1, tzinfo=UTC))
    e.FromDatetime(datetime(2028, 1, 1, tzinfo=UTC))
    rng = common_pb2.TimeRange(start=s, end=e, step_minutes=60)

    def illumination(lat: float, lon: float) -> float:
        vis = site_visibility(common_pb2.Site(lat=lat, lon=lon), rng).visibility
        return float(vis.sun_visible.mean())

    crest, slope = illumination(-89.4403, -137.134), illumination(-89.45, -137.31)
    assert crest > 0.80
    assert slope < 0.60
