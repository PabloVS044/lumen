"""Geometría topocéntrica del sitio en MOON_ME (sección 9.2). Owner: R3 Efemérides/Ciencia.

Modelo esférico (R = 1 737 400 m, esfera de referencia de LOLA): la vertical local es radial,
igual que la normal del elipsoide lunar de pck00011 (radios 1737.4 km en los tres ejes).
"""

import numpy as np
import numpy.typing as npt

from lumen_engine.core.constants import MOON_RADIUS_M

FloatArray = npt.NDArray[np.float64]

_POLE_EPS_DEG = 1e-9


def _pole_safe_lon(lat_deg: float, lon_deg: float) -> float:
    """En el polo exacto la longitud no está definida: se usa lon = 0 como referencia del norte."""
    return 0.0 if abs(abs(lat_deg) - 90.0) < _POLE_EPS_DEG else lon_deg


def site_position_km(
    lat_deg: float, lon_deg: float, *, terrain_height_m: float, obs_height_m: float
) -> FloatArray:
    """Posición cartesiana del observador en MOON_ME, en km."""
    lat = np.radians(lat_deg)
    lon = np.radians(_pole_safe_lon(lat_deg, lon_deg))
    r_km = (MOON_RADIUS_M + terrain_height_m + obs_height_m) / 1000.0
    return np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)]) * r_km


def enu_basis(lat_deg: float, lon_deg: float) -> tuple[FloatArray, FloatArray, FloatArray]:
    """Vectores unitarios (Este, Norte, Arriba) del sitio en MOON_ME."""
    lat = np.radians(lat_deg)
    lon = np.radians(_pole_safe_lon(lat_deg, lon_deg))
    up = np.array([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)])
    east = np.array([-np.sin(lon), np.cos(lon), 0.0])
    north = np.cross(up, east)
    return east, north, up


def azel(
    vectors_km: FloatArray, lat_deg: float, lon_deg: float
) -> tuple[FloatArray, FloatArray, FloatArray]:
    """Azimut (0-360, N=0 horario), elevación y distancia de vectores sitio->objetivo (N x 3)."""
    east, north, up = enu_basis(lat_deg, lon_deg)
    dist = np.linalg.norm(vectors_km, axis=1)
    e = vectors_km @ east
    n = vectors_km @ north
    u = vectors_km @ up
    az = np.degrees(np.arctan2(e, n)) % 360.0
    el = np.degrees(np.arcsin(np.clip(u / dist, -1.0, 1.0)))
    return az, el, dist
