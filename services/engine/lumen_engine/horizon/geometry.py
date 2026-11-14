"""Geometría esférica pura (sin I/O). Owner: Geo/Datos. Sección 9.2 y 9.3.

Funciones puras y vectorizables: aquí va lo que numba compila. Tests en tests/unit/test_geometry.py.
"""

import numpy as np
import numpy.typing as npt

from lumen_engine.core.constants import MOON_RADIUS_M

FloatArray = npt.NDArray[np.float64]


def destination(
    lat_deg: float, lon_deg: float, az_deg: float, dist_m: float, radius_m: float = MOON_RADIUS_M
) -> tuple[float, float]:
    """Punto a `dist_m` sobre la esfera desde (lat, lon) en azimut `az_deg` (N=0, horario)."""
    phi1, lam1 = np.radians(lat_deg), np.radians(lon_deg)
    alpha, delta = np.radians(az_deg), dist_m / radius_m
    phi2 = np.arcsin(np.sin(phi1) * np.cos(delta) + np.cos(phi1) * np.sin(delta) * np.cos(alpha))
    lam2 = lam1 + np.arctan2(
        np.sin(alpha) * np.sin(delta) * np.cos(phi1),
        np.cos(delta) - np.sin(phi1) * np.sin(phi2),
    )
    lon2 = (np.degrees(lam2) + 180.0) % 360.0 - 180.0
    return float(np.degrees(phi2)), float(lon2)


def terrain_elevation_angle(
    r0_m: float, h1_m: float, dist_m: float, radius_m: float = MOON_RADIUS_M
) -> float:
    """Elevación (°) de un punto del terreno visto desde radio r0 (curvatura exacta)."""
    g = dist_m / radius_m
    r1 = radius_m + h1_m
    dx = r1 * np.sin(g)
    dz = r1 * np.cos(g) - r0_m
    return float(np.degrees(np.arctan2(dz, dx)))
