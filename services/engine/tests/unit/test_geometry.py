import pytest

from lumen_engine.core.constants import MOON_RADIUS_M
from lumen_engine.horizon.geometry import destination, terrain_elevation_angle


def test_destination_zero_distance_is_identity() -> None:
    assert destination(-89.0, 45.0, 123.0, 0.0) == pytest.approx((-89.0, 45.0))


def test_flat_terrain_appears_below_zero_due_to_curvature() -> None:
    # Observador a 2 m sobre esfera plana: el terreno a 10 km queda bajo 0°.
    assert terrain_elevation_angle(MOON_RADIUS_M + 2.0, 0.0, 10_000.0) < 0.0
