"""Búsqueda jerárquica de sitios cercanos. Owner: R2 Geo/Datos. Sección 9.10.

Se evalúa una malla gruesa sobre toda la región, se densifican los mejores vecindarios
y se recalculan los top-K con el horizonte completo. El mapa usa el valor del punto
evaluado más cercano para celdas no evaluadas; es exploratorio, no una garantía de óptimo global.
"""

import math
from collections.abc import Callable
from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from lumen.v1 import analysis_pb2, common_pb2, search_pb2
from pyproj import Transformer
from scipy.spatial import cKDTree

from lumen_engine.core.errors import EngineError, NoCoverageError
from lumen_engine.dem import index as dem_index
from lumen_engine.dem.index import LUNAR_GEOGRAPHIC, metric_crs, require_coverage
from lumen_engine.dem.raster import RasterWindow, read_disk, read_points
from lumen_engine.ephem.geometry import azel, enu_basis, site_position_km
from lumen_engine.ephem.spice import BodyEphemeris, EphemerisSeries
from lumen_engine.horizon.mask import compute as compute_horizon
from lumen_engine.metrics.compute import compute as compute_metrics
from lumen_engine.metrics.score import DEFAULT_WEIGHTS, HIGHER_IS_BETTER, score
from lumen_engine.visibility.compute import compute as compute_visibility

FloatArray = npt.NDArray[np.float64]
Progress = Callable[[float, str], None]
COARSE_BUDGET = 256
REFINE_BUDGET = 768
DEFAULT_MAX_SLOPE_DEG = 15.0


@dataclass(frozen=True)
class Grid:
    rows: int
    cols: int
    x: FloatArray
    y: FloatArray
    lat: FloatArray
    lon: FloatArray
    height: FloatArray
    slope: FloatArray
    valid: npt.NDArray[np.bool_]


def _grid(req: search_pb2.FindBestSpotRequest) -> Grid:
    center_lat, center_lon = req.center.lat, req.center.lon
    layers = require_coverage(center_lat, center_lon)
    with layers[0].open() as ds:
        if ds.crs is None:
            raise ValueError("DEM layer has no projection")
        grid_crs = metric_crs(ds.crs, center_lat, center_lon)
        forward = Transformer.from_crs(LUNAR_GEOGRAPHIC, grid_crs, always_xy=True)
        backward = Transformer.from_crs(grid_crs, LUNAR_GEOGRAPHIC, always_xy=True)
        cx, cy = forward.transform(center_lon, center_lat)
    radius = req.radius_km * 1000.0
    n = math.ceil(radius / req.spacing_m)
    axis = np.arange(-n, n + 1, dtype=np.float64) * req.spacing_m
    xx, yy = np.meshgrid(cx + axis, cy + axis)
    cols = xx.shape[1]
    x, y = xx.ravel(), yy.ravel()
    lon, lat = backward.transform(x, y)
    lon, lat = np.asarray(lon), np.asarray(lat)
    inside = (x - cx) ** 2 + (y - cy) ** 2 <= radius**2
    height = np.full(x.shape, np.nan)
    slope = np.full(x.shape, np.nan)
    for layer in layers:
        surface = read_disk(layer, center_lat, center_lon, radius + req.spacing_m)
        h = surface.sample(lon, lat)
        if layer.slope_path:
            sl = read_points(layer, lon, lat, layer.slope_path)
        else:
            with layer.open() as ds:
                source_crs = ds.crs
            geographic = source_crs is not None and source_crs.is_geographic
            if geographic:
                local_crs = metric_crs(source_crs, center_lat, center_lon)
                to_meters = Transformer.from_crs(LUNAR_GEOGRAPHIC, local_crs, always_xy=True)
                from_meters = Transformer.from_crs(local_crs, LUNAR_GEOGRAPHIC, always_xy=True)
                mx, my = to_meters.transform(lon, lat)
                step = layer.resolution_m
                offsets = [
                    from_meters.transform(mx + step, my),
                    from_meters.transform(mx - step, my),
                    from_meters.transform(mx, my + step),
                    from_meters.transform(mx, my - step),
                ]
                z = [surface.sample(np.asarray(lo), np.asarray(la)) for lo, la in offsets]
                sl = np.degrees(
                    np.arctan(np.hypot((z[0] - z[1]) / (2 * step), (z[2] - z[3]) / (2 * step)))
                )
            else:
                dzdy, dzdx = np.gradient(surface.data, layer.resolution_m)
                slope_window = RasterWindow(
                    np.degrees(np.arctan(np.hypot(dzdx, dzdy))),
                    surface.transform,
                    surface.projector,
                )
                sl = slope_window.sample(lon, lat)
        fill = np.isnan(height) & np.isfinite(h) & np.isfinite(sl)
        height[fill], slope[fill] = h[fill], sl[fill]
    max_slope = req.max_slope_deg if req.HasField("max_slope_deg") else DEFAULT_MAX_SLOPE_DEG
    valid = inside & np.isfinite(height) & np.isfinite(slope) & (slope <= max_slope)
    if not valid.any():
        raise NoCoverageError(center_lat, center_lon)
    return Grid(xx.shape[0], cols, x, y, lat, lon, height, slope, valid)


def _vectors(body: BodyEphemeris, lat: float, lon: float) -> FloatArray:
    east, north, up = enu_basis(lat, lon)
    a, e = np.radians(body.az_deg), np.radians(body.el_deg)
    direction = (
        np.outer(np.cos(e) * np.sin(a), east)
        + np.outer(np.cos(e) * np.cos(a), north)
        + np.outer(np.sin(e), up)
    )
    return np.asarray(direction * body.dist_km[:, None], dtype=np.float64)


def _reproject(
    vectors: FloatArray,
    center_position: FloatArray,
    lat: float,
    lon: float,
    height: float,
) -> BodyEphemeris:
    candidate = site_position_km(lat, lon, terrain_height_m=height, obs_height_m=2.0)
    az, el, dist = azel(vectors + center_position - candidate, lat, lon)
    return BodyEphemeris(az, el, dist)


def _value(metrics: list[analysis_pb2.Metrics], req: search_pb2.FindBestSpotRequest) -> list[float]:
    if req.objective == "score":
        return score(metrics, dict(req.weights) or DEFAULT_WEIGHTS)
    if req.objective not in HIGHER_IS_BETTER:
        raise EngineError("UNKNOWN_METRIC", "Unknown search objective.")
    return [float(getattr(m, req.objective)) for m in metrics]


def _rank(values: list[float], objective: str) -> npt.NDArray[np.int64]:
    sign = -1 if objective == "score" or HIGHER_IS_BETTER[objective] else 1
    return np.argsort(sign * np.asarray(values), kind="stable")


def run(
    req: search_pb2.FindBestSpotRequest,
    eph: EphemerisSeries,
    progress: Progress | None = None,
) -> search_pb2.GetBestSpotResultResponse:
    """Calcula ranking y mapa regional con evaluación jerárquica, luego top-K exacto."""
    if req.objective != "score" and req.objective not in HIGHER_IS_BETTER:
        raise EngineError("UNKNOWN_METRIC", "Unknown search objective.")
    if req.objective == "score" and req.weights:
        score([analysis_pb2.Metrics()], dict(req.weights))
    report = progress or (lambda _fraction, _stage: None)
    grid = _grid(req)
    report(0.05, "terrain")
    center_height = float(grid.height[(grid.rows * grid.cols) // 2])
    center_position = site_position_km(
        req.center.lat, req.center.lon, terrain_height_m=center_height, obs_height_m=2.0
    )
    sun_vectors = _vectors(eph.sun, req.center.lat, req.center.lon)
    earth_vectors = _vectors(eph.earth, req.center.lat, req.center.lon)
    center_layers = require_coverage(req.center.lat, req.center.lon)
    shared_windows = {
        layer.id: read_disk(
            layer,
            req.center.lat,
            req.center.lon,
            (
                2_000.0
                if layer.resolution_m <= 10
                else 40_000.0
                if layer.resolution_m <= 40
                else 200_000.0
            )
            + req.radius_km * 1000.0,
        )
        for layer in dem_index.layers()
        if layer.resolution_m < 200 or len(center_layers) == 1
    }
    valid_count = int(np.count_nonzero(grid.valid))
    stride = max(1, math.ceil(math.sqrt(valid_count / COARSE_BUDGET)))
    coarse = [
        row * grid.cols + col
        for row in range(0, grid.rows, stride)
        for col in range(0, grid.cols, stride)
        if grid.valid[row * grid.cols + col]
    ]
    if not coarse:
        coarse = [int(np.flatnonzero(grid.valid)[0])]
    measured: dict[int, analysis_pb2.Metrics] = {}

    def evaluate(i: int, az_step: float) -> analysis_pb2.Metrics:
        site = common_pb2.Site(lat=float(grid.lat[i]), lon=float(grid.lon[i]))
        horizon = compute_horizon(
            site,
            az_step_deg=az_step,
            max_range_km=200,
            near_limit_m=2_000,
            terrain_height_m=float(grid.height[i]),
            preloaded_windows=shared_windows,
        )
        sun = _reproject(sun_vectors, center_position, site.lat, site.lon, float(grid.height[i]))
        earth = _reproject(
            earth_vectors, center_position, site.lat, site.lon, float(grid.height[i])
        )
        visible = compute_visibility(
            sun, earth, np.asarray(horizon.elevation_deg), az_step, common_pb2.Thresholds()
        )
        return compute_metrics(eph.grid, sun, earth, visible)

    for n, i in enumerate(coarse):
        measured[i] = evaluate(i, 1.0)
        report(0.05 + 0.4 * (n + 1) / len(coarse), "horizon")
    coarse_values = _value(list(measured.values()), req)
    coarse_order = _rank(coarse_values, req.objective)
    best_seeds = [coarse[int(k)] for k in coarse_order[: max(8, req.top_k)]]
    candidate_indices: list[int] = []
    for seed in best_seeds:
        row, col = divmod(seed, grid.cols)
        for rr in range(max(0, row - stride), min(grid.rows, row + stride + 1)):
            for cc in range(max(0, col - stride), min(grid.cols, col + stride + 1)):
                i = rr * grid.cols + cc
                if grid.valid[i] and i not in measured:
                    candidate_indices.append(i)
    candidate_indices = list(dict.fromkeys(candidate_indices))[:REFINE_BUDGET]
    for n, i in enumerate(candidate_indices):
        measured[i] = evaluate(i, 1.0)
        report(0.45 + 0.4 * (n + 1) / len(candidate_indices), "metrics")
    indices = list(measured)
    values = _value(list(measured.values()), req)
    ranked = _rank(values, req.objective)
    top_indices = [indices[int(k)] for k in ranked[: req.top_k]]
    for n, i in enumerate(top_indices):
        measured[i] = evaluate(i, 0.25)
        report(0.85 + 0.14 * (n + 1) / len(top_indices), "refine")
    values = _value(list(measured.values()), req)
    ranked = _rank(values, req.objective)
    top = []
    for k in ranked[: req.top_k]:
        i = indices[int(k)]
        m = measured[i]
        top.append(
            search_pb2.SpotCandidate(
                point=common_pb2.LatLon(lat=float(grid.lat[i]), lon=float(grid.lon[i])),
                score=values[int(k)],
                metrics={name: float(getattr(m, name)) for name in HIGHER_IS_BETTER},
            )
        )
    map_values = np.full(grid.valid.size, np.nan)
    tree = cKDTree(np.column_stack((grid.x[indices], grid.y[indices])))
    valid_indices = np.flatnonzero(grid.valid)
    nearest = tree.query(np.column_stack((grid.x[valid_indices], grid.y[valid_indices])))[1]
    map_values[valid_indices] = np.asarray(values)[nearest]
    report(1.0, "done")
    return search_pb2.GetBestSpotResultResponse(
        top=top, grid_cols=grid.cols, grid_rows=grid.rows, grid_values=map_values.tolist()
    )
