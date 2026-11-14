"""Tests de cordura física (sección 4). No sustituyen la validación contra Horizons (14.1)."""

from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2

from lumen_engine.ephem.spice import EphemerisSeries, series

pytestmark = pytest.mark.requires_kernels

T0 = datetime(2027, 1, 1, tzinfo=UTC)
SYNODIC_DAYS = 29.53


def _series(lat: float, lon: float, days: float, step: int) -> EphemerisSeries:
    s, e = Timestamp(), Timestamp()
    s.FromDatetime(T0)
    e.FromDatetime(T0 + timedelta(days=days))
    rng = common_pb2.TimeRange(start=s, end=e, step_minutes=step)
    return series(common_pb2.Site(lat=lat, lon=lon), rng)


def test_sun_circles_the_south_pole_horizon_once_per_synodic_month() -> None:
    res = _series(-89.9, 0.0, SYNODIC_DAYS, 60)
    turned = np.abs(np.sum(np.diff(np.unwrap(np.radians(res.sun.az_deg)))))
    assert np.degrees(turned) == pytest.approx(360.0, abs=10.0)


def test_sun_stays_within_axial_tilt_band_at_the_pole() -> None:
    # Inclinación del eje ~1.54° (sección 4.1); a 2 m de altura el dip es despreciable
    res = _series(-90.0, 0.0, 365, 360)
    assert np.max(np.abs(res.sun.el_deg)) < 1.7
    assert np.max(np.abs(res.sun.el_deg)) > 1.3


def test_earth_near_zenith_at_sub_earth_point() -> None:
    # Libración ±7.9° (lon) y ±6.7° (lat), sección 4.2: combinada hasta ~10.4° del cénit
    res = _series(0.0, 0.0, 30, 120)
    assert np.min(res.earth.el_deg) > 79.0


def test_earth_never_rises_at_farside_center() -> None:
    res = _series(0.0, 180.0, 30, 120)
    assert np.max(res.earth.el_deg) < -79.0


def test_earth_stays_low_and_north_at_south_pole() -> None:
    res = _series(-89.5, 0.0, 30, 120)
    assert np.max(np.abs(res.earth.el_deg)) < 9.0
    # Cerca del polo sur la Tierra está hacia lon 0 (cara visible) = azimut ~0 desde lon 0
    az = (res.earth.az_deg + 180.0) % 360.0 - 180.0
    assert np.max(np.abs(az)) < 20.0
