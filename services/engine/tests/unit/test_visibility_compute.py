import numpy as np
import pytest
from lumen.v1 import common_pb2

from lumen_engine.core.constants import AU_KM
from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.visibility.compute import compute

FLAT = np.zeros(360)  # paso 1°


def _body(az: list[float], el: list[float], dist_km: float) -> BodyEphemeris:
    return BodyEphemeris(
        az_deg=np.array(az), el_deg=np.array(el), dist_km=np.full(len(az), dist_km)
    )


def _sun(el: list[float], az: float = 90.0) -> BodyEphemeris:
    return _body([az] * len(el), el, AU_KM)


# Tierra lejos del Sol en el cielo (sin eclipse) y bien alta
EARTH_HIGH = _body([0.0] * 3, [10.0] * 3, 384_400.0)


def test_sun_fraction_and_default_threshold_on_flat_horizon() -> None:
    vis = compute(_sun([1.0, 0.0, -1.0]), EARTH_HIGH, FLAT, 1.0, common_pb2.Thresholds())
    assert vis.sun_fraction == pytest.approx([1.0, 0.5, 0.0])
    # Default: Sol visible si fracción >= 0.5 (centro visible, sección 9.5)
    assert vis.sun_visible.tolist() == [True, True, False]
    assert vis.horizon_at_sun == pytest.approx([0.0, 0.0, 0.0])


def test_terrain_blocks_sun_in_its_azimuth_only() -> None:
    mask = np.zeros(360)
    mask[85:96] = 3.0  # montaña hacia el este
    sun = _body([90.0, 180.0], [1.0, 1.0], AU_KM)
    earth = _body([0.0, 0.0], [10.0, 10.0], 384_400.0)
    vis = compute(sun, earth, mask, 1.0, common_pb2.Thresholds())
    assert vis.sun_visible.tolist() == [False, True]
    assert vis.horizon_at_sun == pytest.approx([3.0, 0.0])


def test_custom_sun_threshold() -> None:
    th = common_pb2.Thresholds(sun_min_fraction=0.9)
    vis = compute(_sun([0.1, 0.5]), _body([0, 0], [10, 10], 384_400.0), FLAT, 1.0, th)
    assert vis.sun_visible.tolist() == [False, True]


def test_zero_sun_threshold_means_any_part_of_the_disk() -> None:
    th = common_pb2.Thresholds(sun_min_fraction=0.0)
    vis = compute(_sun([-0.2, -1.0]), _body([0, 0], [10, 10], 384_400.0), FLAT, 1.0, th)
    assert vis.sun_visible.tolist() == [True, False]


def test_earth_visibility_uses_center_plus_margin() -> None:
    earth = _body([0.0, 0.0, 0.0], [0.5, 2.0, -0.1], 384_400.0)
    sun = _sun([1.0, 1.0, 1.0])
    default = compute(sun, earth, FLAT, 1.0, common_pb2.Thresholds())
    assert default.earth_visible.tolist() == [True, True, False]
    margin = compute(sun, earth, FLAT, 1.0, common_pb2.Thresholds(earth_margin_deg=1.0))
    assert margin.earth_visible.tolist() == [False, True, False]
    assert default.earth_fraction[1] == pytest.approx(1.0)


def test_operable_requires_sun_and_earth() -> None:
    sun = _sun([1.0, 1.0, -1.0])
    earth = _body([0.0] * 3, [5.0, -5.0, 5.0], 384_400.0)
    vis = compute(sun, earth, FLAT, 1.0, common_pb2.Thresholds())
    assert vis.operable.tolist() == [True, False, False]


def test_eclipse_removes_sunlight_even_above_horizon() -> None:
    # Sol detrás del centro de la Tierra: totalmente eclipsado
    sun = _body([200.0], [5.0], AU_KM)
    earth = _body([200.0], [5.0], 384_400.0)
    vis = compute(sun, earth, FLAT, 1.0, common_pb2.Thresholds())
    assert vis.eclipse_fraction[0] == pytest.approx(1.0)
    assert vis.sun_fraction[0] == pytest.approx(0.0)
    assert not vis.sun_visible[0]


@pytest.mark.requires_kernels
def test_end_to_end_with_real_ephemeris_on_flat_horizon() -> None:
    from datetime import UTC, datetime

    from google.protobuf.timestamp_pb2 import Timestamp

    from lumen_engine.ephem.spice import series

    s, e = Timestamp(), Timestamp()
    s.FromDatetime(datetime(2027, 1, 1, tzinfo=UTC))
    e.FromDatetime(datetime(2027, 3, 1, tzinfo=UTC))
    rng = common_pb2.TimeRange(start=s, end=e, step_minutes=60)
    eph = series(common_pb2.Site(lat=0.674, lon=23.473), rng)  # Apollo 11, ecuatorial
    vis = compute(eph.sun, eph.earth, FLAT, 1.0, common_pb2.Thresholds())
    n = len(eph.grid)
    assert vis.sun_visible.shape == vis.earth_visible.shape == (n,)
    # Ecuador, horizonte plano: Sol arriba ~ la mitad del tiempo; Tierra siempre (cara visible)
    assert 0.45 < vis.sun_visible.mean() < 0.55
    assert vis.earth_visible.all()
    assert np.array_equal(vis.operable, vis.sun_visible & vis.earth_visible)
    assert np.all((vis.sun_fraction >= 0) & (vis.sun_fraction <= 1))
