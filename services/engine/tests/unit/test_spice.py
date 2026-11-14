from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
import spiceypy as sp
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2

from lumen_engine.ephem.geometry import site_position_km

pytestmark = pytest.mark.requires_kernels

T0 = datetime(2027, 1, 1, tzinfo=UTC)


def _range(start: datetime, end: datetime, step: int) -> common_pb2.TimeRange:
    s, e = Timestamp(), Timestamp()
    s.FromDatetime(start)
    e.FromDatetime(end)
    return common_pb2.TimeRange(start=s, end=e, step_minutes=step)


def test_series_shapes_and_ranges() -> None:
    from lumen_engine.ephem.spice import series

    site = common_pb2.Site(lat=-89.45, lon=-137.31)
    res = series(site, _range(T0, T0 + timedelta(days=2), 60))
    n = len(res.grid)
    assert n == 49
    for body in (res.sun, res.earth):
        assert body.az_deg.shape == body.el_deg.shape == body.dist_km.shape == (n,)
        assert np.all((body.az_deg >= 0) & (body.az_deg < 360))
    assert np.all((res.sun.dist_km > 1.45e8) & (res.sun.dist_km < 1.53e8))
    assert np.all((res.earth.dist_km > 3.5e5) & (res.earth.dist_km < 4.1e5))


@pytest.mark.parametrize("target", ["SUN", "EARTH"])
def test_series_matches_spice_azlcpo(target: str) -> None:
    """Opción B (spkcpo + ENU propia) debe coincidir con azlcpo de CSPICE (vertical radial)."""
    from lumen_engine.ephem.kernels import load_kernels
    from lumen_engine.ephem.spice import series

    load_kernels()
    lat, lon = -85.9, 33.2
    res = series(common_pb2.Site(lat=lat, lon=lon), _range(T0, T0 + timedelta(days=10), 360))
    body = res.sun if target == "SUN" else res.earth
    obspos = site_position_km(lat, lon, terrain_height_m=0.0, obs_height_m=2.0)
    for i, et in enumerate(res.grid.et):
        azl, _ = sp.azlcpo("ELLIPSOID", target, et, "LT+S", False, True, obspos, "MOON", "MOON_ME")
        assert body.az_deg[i] == pytest.approx(np.degrees(azl[1]) % 360, abs=1e-6)
        assert body.el_deg[i] == pytest.approx(np.degrees(azl[2]), abs=1e-6)
        assert body.dist_km[i] == pytest.approx(azl[0], rel=1e-9)


def test_state_returns_unit_vectors() -> None:
    from lumen_engine.ephem.spice import state

    st = state(T0)
    assert np.linalg.norm(st.sun_dir) == pytest.approx(1.0)
    assert np.linalg.norm(st.earth_dir) == pytest.approx(1.0)
    # La Tierra está siempre cerca de +X (cara visible) en MOON_ME, dentro de la libración
    assert st.earth_dir[0] > np.cos(np.radians(12))
