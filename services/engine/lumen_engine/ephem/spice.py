"""Efemérides Sol/Tierra con SPICE (DE440). Owner: R3 Efemérides/Ciencia. Sección 9.4.

Marco MOON_ME, aberración LT+S (posición aparente). Opción B de la sección 9.4.3:
vector sitio->cuerpo con `spkcpo` y az/el con la base ENU propia (`ephem.geometry`).
Validado contra `azlcpo` (tests) y contra JPL Horizons (tests/validation).
"""

from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
import spiceypy as sp
from lumen.v1 import common_pb2

from lumen_engine.core.constants import BODY_FIXED_FRAME
from lumen_engine.core.defaults import normalize_lon, obs_height
from lumen_engine.ephem.geometry import FloatArray, azel, site_position_km
from lumen_engine.ephem.kernels import check_coverage, load_kernels
from lumen_engine.ephem.timegrid import TimeGrid, build_grid

ABERRATION = "LT+S"
_OBSERVER_CENTER = "MOON"


@dataclass(frozen=True)
class BodyEphemeris:
    az_deg: FloatArray
    el_deg: FloatArray
    dist_km: FloatArray

    def window(self, start: int, stop: int) -> "BodyEphemeris":
        return BodyEphemeris(
            self.az_deg[start:stop], self.el_deg[start:stop], self.dist_km[start:stop]
        )


@dataclass(frozen=True)
class EphemerisSeries:
    grid: TimeGrid
    sun: BodyEphemeris
    earth: BodyEphemeris


@dataclass(frozen=True)
class EphemerisState:
    time: datetime
    sun_dir: FloatArray  # unitario, MOON_ME, desde el centro lunar
    earth_dir: FloatArray


def _body_vectors(target: str, ets: FloatArray, obspos_km: FloatArray) -> FloatArray:
    out = np.empty((ets.size, 3))
    for i, et in enumerate(ets):
        st, _ = sp.spkcpo(
            target,
            float(et),
            BODY_FIXED_FRAME,
            "OBSERVER",
            ABERRATION,
            obspos_km,
            _OBSERVER_CENTER,
            BODY_FIXED_FRAME,
        )
        out[i] = st[:3]
    return out


def body_azel(
    target: str,
    ets: FloatArray,
    lat_deg: float,
    lon_deg: float,
    *,
    obs_height_m: float,
    terrain_height_m: float = 0.0,
) -> BodyEphemeris:
    """az/el/distancia de `target` ("SUN" | "EARTH") desde el sitio en los instantes ET dados."""
    load_kernels()
    lon = normalize_lon(lon_deg)
    obspos = site_position_km(
        lat_deg, lon, terrain_height_m=terrain_height_m, obs_height_m=obs_height_m
    )
    az, el, dist = azel(_body_vectors(target, ets, obspos), lat_deg, lon)
    return BodyEphemeris(az_deg=az, el_deg=el, dist_km=dist)


def series(
    site: common_pb2.Site, time_range: common_pb2.TimeRange, *, terrain_height_m: float = 0.0
) -> EphemerisSeries:
    """az/el/distancia de Sol y Tierra vistos desde el sitio en cada instante del rango.

    `terrain_height_m`: altura del terreno en el sitio (DEM, R2). Con 0 el error en az/el es
    < 0.001° para alturas lunares típicas (paralaje de pocos km frente a 384 000 km).
    """
    grid = build_grid(time_range)
    sun, earth = (
        body_azel(
            target,
            grid.et,
            site.lat,
            site.lon,
            obs_height_m=obs_height(site),
            terrain_height_m=terrain_height_m,
        )
        for target in ("SUN", "EARTH")
    )
    return EphemerisSeries(grid=grid, sun=sun, earth=earth)


def state(t: datetime) -> EphemerisState:
    """Direcciones unitarias al Sol y a la Tierra desde el centro lunar, en MOON_ME."""
    t = t.astimezone(UTC)
    check_coverage(t, t)
    load_kernels()
    et = sp.str2et(t.strftime("%Y-%m-%dT%H:%M:%S.%f"))
    dirs = []
    for target in ("SUN", "EARTH"):
        pos, _ = sp.spkpos(target, et, BODY_FIXED_FRAME, ABERRATION, _OBSERVER_CENTER)
        v = np.asarray(pos, dtype=np.float64)
        dirs.append(v / np.linalg.norm(v))
    return EphemerisState(time=t, sun_dir=dirs[0], earth_dir=dirs[1])
