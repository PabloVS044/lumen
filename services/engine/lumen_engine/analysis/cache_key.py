"""Llaves de caché del horizonte y del análisis (sección 11.1). Owner: R1.

Cerca de los polos lat/lon son malas llaves (un grado de longitud mide casi nada), así que el
horizonte se indexa por coordenadas estereográficas polares redondeadas a 5 m. Fuera de la
proyección polar se usan lat/lon redondeados a 1e-4°.
"""

import hashlib
import math
import os
from collections.abc import Iterable

from lumen_engine.core.constants import MOON_RADIUS_M
from lumen_engine.core.defaults import normalize_lon
from lumen_engine.dem.index import Layer, layers

# Por encima de esta |latitud| se usa la proyección polar (los DEM polares LOLA llegan a 80°).
POLAR_LAT_DEG = 80.0
STEREO_ROUND_M = 5.0
LATLON_ROUND_DEG = 1e-4


def polar_stereo_xy(lat_deg: float, lon_deg: float) -> tuple[float, float]:
    """Estereográfica polar (k=1 en el polo, R de la esfera LOLA), forma cerrada de PROJ `stere`.

    Sur (lat_0=-90): ρ = 2R·tan(π/4 + φ/2), x = ρ·sin λ, y = ρ·cos λ.
    Norte (lat_0=+90): ρ = 2R·tan(π/4 − φ/2), x = ρ·sin λ, y = −ρ·cos λ.
    """
    phi, lam = math.radians(lat_deg), math.radians(lon_deg)
    if lat_deg < 0:
        rho = 2.0 * MOON_RADIUS_M * math.tan(math.pi / 4 + phi / 2)
        return rho * math.sin(lam), rho * math.cos(lam)
    rho = 2.0 * MOON_RADIUS_M * math.tan(math.pi / 4 - phi / 2)
    return rho * math.sin(lam), -rho * math.cos(lam)


def _round_to(value: float, quantum: float) -> float:
    # + 0.0 evita "-0" en la llave cuando el valor redondea a cero desde negativo.
    return round(value / quantum) * quantum + 0.0


def _location_token(lat: float, lon: float) -> str:
    lon = normalize_lon(lon)
    if abs(lat) >= POLAR_LAT_DEG:
        x, y = polar_stereo_xy(lat, lon)
        pole = "S" if lat < 0 else "N"
        return f"{pole}|{_round_to(x, STEREO_ROUND_M):.0f}|{_round_to(y, STEREO_ROUND_M):.0f}"
    return f"G|{_round_to(lat, LATLON_ROUND_DEG):.4f}|{_round_to(lon, LATLON_ROUND_DEG):.4f}"


def dem_version(available: Iterable[Layer] | None = None) -> str:
    """Huella de los DEM instalados: id, ruta, resolución y (si es local) tamaño y mtime.

    Reemplazar o volver a descargar un DEM invalida la caché del horizonte sin pasos manuales.
    """
    parts = []
    for layer in layers() if available is None else available:
        stamp = ""
        if not layer.path.startswith("/vsi"):
            try:
                st = os.stat(layer.path)
                stamp = f"{st.st_size}:{st.st_mtime_ns}"
            except OSError:
                stamp = "missing"
        parts.append(f"{layer.id}|{layer.path}|{layer.resolution_m:g}|{stamp}")
    return hashlib.sha1("\n".join(parts).encode()).hexdigest()[:16]


def horizon_cache_key(
    lat: float,
    lon: float,
    *,
    obs_height_m: float,
    az_step_deg: float,
    max_range_km: float,
    dem_version: str,
) -> str:
    """`key_horizon` de la sección 11.1 (sha1 de DEM, posición redondeada y parámetros)."""
    raw = (
        f"{dem_version}|{_location_token(lat, lon)}|{obs_height_m:.1f}|"
        f"{az_step_deg:g}|{max_range_km:g}"
    )
    return hashlib.sha1(raw.encode()).hexdigest()


def analysis_cache_key(
    horizon_key: str,
    *,
    start_iso: str,
    end_iso: str,
    step_minutes: int,
    sun_min_fraction: float,
    earth_margin_deg: float,
    engine_version: str,
) -> str:
    """Llave del `AnalysisResult` completo: horizonte + rango + umbrales + versión del motor."""
    raw = (
        f"{horizon_key}|{start_iso}|{end_iso}|{step_minutes}|"
        f"{sun_min_fraction!r}|{earth_margin_deg!r}|{engine_version}"
    )
    return hashlib.sha1(raw.encode()).hexdigest()
