"""Máscara de horizonte por ray-casting. Owner: R2 Geo/Datos. Sección 9.3."""

from collections.abc import Mapping
from itertools import pairwise

import numpy as np
from lumen.v1 import common_pb2, horizon_pb2

from lumen_engine.core.constants import MOON_RADIUS_M
from lumen_engine.core.defaults import normalize_lon, obs_height
from lumen_engine.core.errors import EngineError
from lumen_engine.dem.coverage import sample_height
from lumen_engine.dem.index import Layer, layers
from lumen_engine.dem.raster import RasterWindow, read_disk
from lumen_engine.horizon.geometry import destination_grid


def _limit(layer: Layer, max_range_m: float, near_limit_m: float) -> float:
    if layer.resolution_m <= 10:
        return min(near_limit_m, max_range_m)
    if layer.resolution_m <= 40:
        return min(40_000.0, max_range_m)
    return max_range_m


def _distances(start: float, stop: float, step: float) -> np.ndarray:
    if stop <= start:
        return np.empty(0, dtype=np.float64)
    if start == 0 and step > 1:
        # El relieve a pocos metros del observador domina el ángulo. Incluso en un
        # raster de 5 m, interpolar entre centros requiere pasos subpíxel aquí.
        near_end = min(200.0, stop)
        near = np.arange(1.0, near_end + 0.5, 1.0, dtype=np.float64)
        far = np.arange(near_end + step, stop + step / 2, step, dtype=np.float64)
        return np.concatenate((near, far))
    return np.arange(start + step, stop + step / 2, step, dtype=np.float64)


def _tiers(
    available: list[Layer], max_range_m: float, near_limit_m: float, radial_step_factor: float
) -> list[tuple[np.ndarray, list[Layer]]]:
    cuts = [0.0, min(near_limit_m, max_range_m), min(40_000.0, max_range_m), max_range_m]
    tiers = []
    for start, stop in pairwise(cuts):
        if stop <= start:
            continue
        usable = [layer for layer in available if _limit(layer, max_range_m, near_limit_m) >= stop]
        if not usable:
            raise EngineError("INSUFFICIENT_DEM_RANGE", "No DEM layer reaches the requested range.")
        step = max(1.0, min(layer.resolution_m for layer in usable) * radial_step_factor)
        tiers.append((_distances(start, stop, step), usable))
    return tiers


def compute(
    site: common_pb2.Site,
    *,
    az_step_deg: float,
    max_range_km: float,
    near_limit_m: float = 10_000.0,
    radial_step_factor: float = 1.0,
    terrain_height_m: float | None = None,
    preloaded_windows: Mapping[str, RasterWindow] | None = None,
) -> horizon_pb2.HorizonMask:
    """Elevación máxima por azimut con capas adaptativas y curvatura esférica exacta.

    La ventana de cada COG se lee una vez; los rayos se procesan en bloques para
    limitar memoria. Los huecos en la capa fina se rellenan con la siguiente capa.
    """
    lon = normalize_lon(site.lon)
    h0 = sample_height(site.lat, lon)[0] if terrain_height_m is None else terrain_height_m
    max_range_m = max_range_km * 1000.0
    available = list(layers())
    tiers = _tiers(available, max_range_m, near_limit_m, radial_step_factor)
    windows = dict(preloaded_windows or {})
    count = round(360.0 / az_step_deg)
    if count <= 0 or not np.isclose(count * az_step_deg, 360.0):
        raise EngineError("INVALID_AZ_STEP", "Azimuth step must divide 360 degrees.")
    azimuths = np.arange(count, dtype=np.float64) * az_step_deg
    best = np.full(count, -90.0, dtype=np.float64)
    best_dist = np.zeros(count, dtype=np.float64)
    found = np.zeros(count, dtype=bool)
    far_covered = np.zeros(count, dtype=bool)
    used: set[str] = set()
    radius = MOON_RADIUS_M
    r0 = radius + h0 + obs_height(site)
    for offset in range(0, count, 32):
        az = azimuths[offset : offset + 32, None]
        slice_ = slice(offset, offset + len(az))
        for tier_index, (distances, usable) in enumerate(tiers):
            if not distances.size:
                continue
            lat, lon_grid = destination_grid(site.lat, lon, az, distances[None, :])
            height = np.full(lat.shape, np.nan, dtype=np.float64)
            for layer in usable:
                missing = ~np.isfinite(height)
                if not missing.any():
                    break
                if layer.id not in windows:
                    windows[layer.id] = read_disk(
                        layer, site.lat, lon, _limit(layer, max_range_m, near_limit_m)
                    )
                sampled = windows[layer.id].sample(lon_grid, lat)
                fill = missing & np.isfinite(sampled)
                if fill.any():
                    height[fill] = sampled[fill]
                    used.add(layer.id)
            if tier_index == len(tiers) - 1:
                tail = (
                    max(1, round(1000.0 / (distances[-1] - distances[-2])))
                    if distances.size > 1
                    else 1
                )
                far_covered[slice_] = np.isfinite(height[:, -tail:]).any(axis=1)
            delta = distances[None, :] / radius
            r1 = radius + height
            elevation = np.degrees(np.arctan2(r1 * np.cos(delta) - r0, r1 * np.sin(delta)))
            elevation[~np.isfinite(height)] = -90.0
            idx = np.argmax(elevation, axis=1)
            rows = np.arange(len(az))
            value = elevation[rows, idx]
            better = value > best[slice_]
            best[slice_][better] = value[better]
            best_dist[slice_][better] = distances[idx[better]]
            found[slice_] |= np.isfinite(height).any(axis=1)
    if not found.all():
        raise EngineError("DEM_GAP", "One or more azimuths have no terrain samples.")
    if not far_covered.all():
        raise EngineError("INSUFFICIENT_DEM_RANGE", "DEM does not cover the far end of every ray.")
    return horizon_pb2.HorizonMask(
        az_step_deg=az_step_deg,
        elevation_deg=best.tolist(),
        obstacle_distance_m=best_dist.tolist(),
        observer=horizon_pb2.Observer(
            lat=site.lat,
            lon=lon,
            terrain_height_m=h0,
            obs_height_m=obs_height(site),
        ),
        layers_used=[layer.id for layer in available if layer.id in used],
        max_range_km=max_range_km,
    )
