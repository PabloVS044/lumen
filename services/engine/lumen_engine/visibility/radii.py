"""Radios angulares del Sol y la Tierra vistos desde el sitio (sección 9.4.5).
Owner: R3 Efemérides/Ciencia."""

import numpy as np

from lumen_engine.core.constants import EARTH_RADIUS_KM, SUN_RADIUS_KM
from lumen_engine.visibility.disk import FloatArray


def _angular_radius_deg(radius_km: float, dist_km: FloatArray) -> FloatArray:
    out: FloatArray = np.degrees(np.arcsin(radius_km / dist_km))
    return out


def sun_radius_deg(dist_km: FloatArray) -> FloatArray:
    return _angular_radius_deg(SUN_RADIUS_KM, dist_km)


def earth_radius_deg(dist_km: FloatArray) -> FloatArray:
    return _angular_radius_deg(EARTH_RADIUS_KM, dist_km)
