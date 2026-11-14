from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from lumen.v1 import analysis_pb2

from lumen_engine.core.constants import AU_KM, SOLAR_CONSTANT_W_M2
from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.metrics.compute import compute
from lumen_engine.metrics.streaks import run_count
from lumen_engine.visibility.compute import Visibility

T0 = datetime(2027, 1, 1, tzinfo=UTC)
STEP_MIN = 60


def _grid(n: int) -> TimeGrid:
    t0 = np.datetime64("2027-01-01T00:00:00", "s")
    utc = t0 + np.arange(n) * np.timedelta64(STEP_MIN * 60, "s")
    return TimeGrid(
        utc=utc, et=np.arange(n, dtype=np.float64) * STEP_MIN * 60.0, step_minutes=STEP_MIN
    )


def _vis(sun: list[bool], earth: list[bool], eclipse: list[float] | None = None) -> Visibility:
    s, e = np.array(sun), np.array(earth)
    n = s.size
    return Visibility(
        horizon_at_sun=np.zeros(n),
        horizon_at_earth=np.zeros(n),
        sun_fraction=s.astype(float),
        earth_fraction=e.astype(float),
        eclipse_fraction=np.array(eclipse if eclipse is not None else [0.0] * n),
        sun_visible=s,
        earth_visible=e,
        operable=s & e,
    )


def _body(el: list[float], dist: float) -> BodyEphemeris:
    n = len(el)
    return BodyEphemeris(az_deg=np.zeros(n), el_deg=np.array(el), dist_km=np.full(n, dist))


SUN = [True, True, False, False, False, True, True, True]
EARTH = [True, False, False, True, True, True, False, True]


@pytest.fixture
def metrics() -> analysis_pb2.Metrics:
    n = len(SUN)
    sun = _body([1.0, 2.0, -1.0, -1.0, -1.0, 0.5, 1.5, 1.0], AU_KM)
    earth = _body([3.0, -1.0, -1.0, 2.0, 2.0, 2.0, -1.0, 4.0], 384_400.0)
    return compute(_grid(n), sun, earth, _vis(SUN, EARTH))


def test_run_count() -> None:
    assert run_count(np.array(SUN), False) == 1
    assert run_count(np.array(EARTH), False) == 2


def test_percentages(metrics: analysis_pb2.Metrics) -> None:
    assert metrics.illumination_pct == pytest.approx(100 * 5 / 8)
    assert metrics.illumination_pct_weighted == pytest.approx(100 * 5 / 8)
    assert metrics.earth_visible_pct == pytest.approx(100 * 5 / 8)
    assert metrics.operable_pct == pytest.approx(100 * 3 / 8)  # índices 0, 5, 7


def test_streak_durations_in_hours(metrics: analysis_pb2.Metrics) -> None:
    assert metrics.longest_dark_h == pytest.approx(3.0)
    assert metrics.dark_periods_count == 1
    assert metrics.longest_comm_window_h == pytest.approx(3.0)
    assert metrics.longest_comm_blackout_h == pytest.approx(2.0)
    assert metrics.longest_operable_window_h == pytest.approx(1.0)
    assert metrics.earth_visible_h == pytest.approx(5.0)


def test_longest_dark_interval(metrics: analysis_pb2.Metrics) -> None:
    iv = metrics.longest_dark_interval
    assert iv.start.ToDatetime(tzinfo=UTC) == T0 + timedelta(hours=2)
    assert iv.end.ToDatetime(tzinfo=UTC) == T0 + timedelta(hours=5)
    assert not iv.truncated


def test_elevation_statistics(metrics: analysis_pb2.Metrics) -> None:
    assert metrics.sun_elev_mean_visible_deg == pytest.approx(np.mean([1.0, 2.0, 0.5, 1.5, 1.0]))
    assert metrics.sun_elev_max_deg == pytest.approx(2.0)
    assert metrics.sun_elev_min_deg == pytest.approx(-1.0)
    assert metrics.earth_elev_max_deg == pytest.approx(4.0)


def test_truncated_dark_period_at_range_edge() -> None:
    n = 4
    vis = _vis([False, False, True, True], [True] * n)
    m = compute(_grid(n), _body([-1, -1, 1, 1], AU_KM), _body([5] * n, 384_400.0), vis)
    assert m.longest_dark_interval.truncated


def test_no_visible_sun_leaves_mean_unset() -> None:
    n = 3
    vis = _vis([False] * n, [True] * n)
    m = compute(_grid(n), _body([-1] * n, AU_KM), _body([5] * n, 384_400.0), vis)
    assert not m.HasField("sun_elev_mean_visible_deg")
    assert m.illumination_pct == 0.0


def test_eclipse_hours_and_energy() -> None:
    n = 4
    vis = _vis([True] * n, [True] * n, eclipse=[0.0, 0.5, 1.0, 0.0])
    vis = Visibility(**{**vis.__dict__, "sun_fraction": np.array([1.0, 0.5, 0.0, 1.0])})
    m = compute(_grid(n), _body([0.0] * n, AU_KM), _body([5] * n, 384_400.0), vis)
    assert m.eclipse_hours == pytest.approx(2.0)
    # Panel vertical con seguimiento, el = 0 -> cos(el) = 1; fracciones 1 + 0.5 + 0 + 1 = 2.5 h·S0
    assert m.energy_kwh_per_m2 == pytest.approx(2.5 * SOLAR_CONSTANT_W_M2 / 1000.0)
