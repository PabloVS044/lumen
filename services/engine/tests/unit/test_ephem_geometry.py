import numpy as np
import pytest
from hypothesis import given
from hypothesis import strategies as st

from lumen_engine.core.constants import MOON_RADIUS_M
from lumen_engine.ephem.geometry import azel, enu_basis, site_position_km

lats = st.floats(min_value=-90, max_value=90, allow_nan=False)
lons = st.floats(min_value=-180, max_value=179.999, allow_nan=False)


@given(lats, lons)
def test_enu_basis_is_right_handed_orthonormal(lat: float, lon: float) -> None:
    east, north, up = enu_basis(lat, lon)
    basis = np.vstack([east, north, up])
    assert np.allclose(basis @ basis.T, np.eye(3), atol=1e-12)
    assert np.allclose(np.cross(east, north), up, atol=1e-12)


def test_site_position_uses_reference_sphere_plus_heights() -> None:
    r = site_position_km(-89.45, -137.31, terrain_height_m=1820.5, obs_height_m=2.0)
    assert np.linalg.norm(r) == pytest.approx((MOON_RADIUS_M + 1822.5) / 1000.0)


@pytest.mark.parametrize(
    ("direction", "az", "el"),
    [("north", 0.0, 0.0), ("east", 90.0, 0.0), ("south", 180.0, 0.0), ("west", 270.0, 0.0)],
)
def test_azel_cardinal_directions(direction: str, az: float, el: float) -> None:
    east, north, _ = enu_basis(-45.0, 30.0)
    vec = {"north": north, "east": east, "south": -north, "west": -east}[direction]
    got_az, got_el, dist = azel(vec[None, :] * 5.0, -45.0, 30.0)
    assert got_az[0] == pytest.approx(az, abs=1e-9) or got_az[0] == pytest.approx(az + 360.0)
    assert got_el[0] == pytest.approx(el, abs=1e-9)
    assert dist[0] == pytest.approx(5.0)


def test_azel_zenith_and_elevation_sign() -> None:
    _, north, up = enu_basis(10.0, 20.0)
    v = np.vstack([up, north + up, north - up])
    _, el, _ = azel(v, 10.0, 20.0)
    assert el == pytest.approx([90.0, 45.0, -45.0])


def test_exact_pole_uses_lon_zero_as_north_reference() -> None:
    assert np.allclose(enu_basis(-90.0, 123.0), enu_basis(-90.0, 0.0))
