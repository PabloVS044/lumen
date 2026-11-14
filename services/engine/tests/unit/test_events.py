from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from lumen.v1 import common_pb2, ephemeris_pb2

from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.metrics.events import detect, next_event
from lumen_engine.visibility.compute import Visibility

T0 = datetime(2027, 1, 1, tzinfo=UTC)
ET = ephemeris_pb2


def _grid(n: int) -> TimeGrid:
    utc = np.datetime64("2027-01-01T00:00:00", "s") + np.arange(n) * np.timedelta64(3600, "s")
    return TimeGrid(utc=utc, et=np.arange(n, dtype=np.float64) * 3600.0, step_minutes=60)


def _case(
    sun_frac: list[float], earth_el: list[float], eclipse: list[float] | None = None
) -> tuple[TimeGrid, BodyEphemeris, Visibility]:
    n = len(sun_frac)
    sf, ee = np.array(sun_frac), np.array(earth_el)
    ecl = np.array(eclipse if eclipse is not None else [0.0] * n)
    earth = BodyEphemeris(az_deg=np.zeros(n), el_deg=ee, dist_km=np.full(n, 384_400.0))
    vis = Visibility(
        horizon_at_sun=np.zeros(n),
        horizon_at_earth=np.zeros(n),
        sun_fraction=sf,
        earth_fraction=np.clip(ee, 0, 1),
        eclipse_fraction=ecl,
        sun_visible=sf >= 0.5,
        earth_visible=ee >= 0,
        operable=(sf >= 0.5) & (ee >= 0),
    )
    return _grid(n), earth, vis


def _types(events: list[ephemeris_pb2.Event]) -> list[int]:
    return [e.type for e in events]


def test_sunrise_time_is_interpolated_between_samples() -> None:
    grid, earth, vis = _case([0.0, 0.25, 0.75, 1.0], [5, 5, 5, 5])
    events = detect(grid, earth, vis, common_pb2.Thresholds())
    assert _types(events) == [ET.EVENT_TYPE_SUNRISE]
    # Fracción cruza 0.5 a mitad entre t=1h y t=2h
    assert events[0].time.ToDatetime(tzinfo=UTC) == T0 + timedelta(hours=1, minutes=30)


def test_earthset_and_earthrise_from_elevation_margin() -> None:
    grid, earth, vis = _case([1, 1, 1, 1, 1], [1.0, -3.0, -1.0, 1.0, 2.0])
    events = detect(grid, earth, vis, common_pb2.Thresholds())
    assert _types(events) == [ET.EVENT_TYPE_EARTHSET, ET.EVENT_TYPE_EARTHRISE]
    assert events[0].time.ToDatetime(tzinfo=UTC) == T0 + timedelta(minutes=15)
    assert events[1].time.ToDatetime(tzinfo=UTC) == T0 + timedelta(hours=2, minutes=30)


def test_eclipse_events_are_ordered_with_others() -> None:
    grid, earth, vis = _case([1, 1, 0, 1, 1], [5] * 5, eclipse=[0, 0.4, 1, 0.4, 0])
    types = _types(detect(grid, earth, vis, common_pb2.Thresholds()))
    assert types == [
        ET.EVENT_TYPE_ECLIPSE_START,
        ET.EVENT_TYPE_SUNSET,
        ET.EVENT_TYPE_SUNRISE,
        ET.EVENT_TYPE_ECLIPSE_END,
    ]


def test_next_event_filters_by_time_and_type() -> None:
    grid, earth, vis = _case([1, 1, 1, 1, 1], [1.0, -3.0, -1.0, 1.0, 2.0])
    events = detect(grid, earth, vis, common_pb2.Thresholds())
    after = T0 + timedelta(hours=1)
    ev = next_event(events, after, {ET.EVENT_TYPE_EARTHRISE, ET.EVENT_TYPE_EARTHSET})
    assert ev is not None and ev.type == ET.EVENT_TYPE_EARTHRISE
    assert next_event(events, T0 + timedelta(hours=9), {ET.EVENT_TYPE_EARTHRISE}) is None


@pytest.mark.requires_kernels
def test_equatorial_sunrises_repeat_every_synodic_month() -> None:
    from google.protobuf.timestamp_pb2 import Timestamp

    from lumen_engine.ephem.spice import series
    from lumen_engine.visibility.compute import compute

    s, e = Timestamp(), Timestamp()
    s.FromDatetime(T0)
    e.FromDatetime(T0 + timedelta(days=95))
    rng = common_pb2.TimeRange(start=s, end=e, step_minutes=30)
    eph = series(common_pb2.Site(lat=0.674, lon=23.473), rng)
    vis = compute(eph.sun, eph.earth, np.zeros(360), 1.0, common_pb2.Thresholds())
    events = detect(eph.grid, eph.earth, vis, common_pb2.Thresholds())
    rises = [ev.time.ToDatetime(tzinfo=UTC) for ev in events if ev.type == ET.EVENT_TYPE_SUNRISE]
    gaps = np.diff([r.timestamp() for r in rises]) / 86_400
    assert len(rises) >= 3
    assert np.allclose(gaps, 29.53, atol=0.6)
