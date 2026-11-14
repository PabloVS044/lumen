import numpy as np
import pytest

from lumen_engine.core.constants import AU_KM
from lumen_engine.visibility.radii import earth_radius_deg, sun_radius_deg


def test_sun_angular_radius_at_one_au() -> None:
    # Sección 9.4.5: ≈ 0.266°
    assert sun_radius_deg(np.array([AU_KM]))[0] == pytest.approx(0.2665, abs=1e-3)


def test_earth_angular_radius_from_the_moon() -> None:
    # Sección 4.2 / 9.4.5: ≈ 0.95° a 384 400 km (diámetro ≈ 1.9°)
    assert earth_radius_deg(np.array([384_400.0]))[0] == pytest.approx(0.9496, abs=1e-3)
