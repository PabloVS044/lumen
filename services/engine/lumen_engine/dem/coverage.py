"""Acceso a DEMs (COG multi-resolución). Owner: R2 Geo/Datos. Secciones 8.1, 9.3, 11.4."""

import numpy as np
import rasterio
from lumen.v1 import terrain_pb2
from rasterio.windows import Window

from lumen_engine.dem.index import Layer, project, require_coverage
from lumen_engine.dem.raster import read_points


def _one(layer: Layer, lat: float, lon: float, path: str | None = None) -> float:
    return float(read_points(layer, np.array([lon]), np.array([lat]), path)[0])


def sample_height(lat: float, lon: float) -> tuple[float, Layer]:
    """Primera capa válida, de resolución más fina a más gruesa."""
    for layer in require_coverage(lat, lon):
        height = _one(layer, lat, lon)
        if np.isfinite(height):
            return height, layer
    from lumen_engine.core.errors import NoCoverageError

    raise NoCoverageError(lat, lon)


def coverage(lat: float, lon: float) -> terrain_pb2.Coverage:
    """Capas que cubren (lat, lon), resolución cercana y advertencias de interpolación (LDEC=0)."""
    found = require_coverage(lat, lon)
    _, fine = sample_height(lat, lon)
    interpolated_fraction: float | None = None
    warnings: list[str] = []
    if fine.id != found[0].id:
        warnings.append(f"Finest DEM has NoData at this point; using {fine.id}.")
    if fine.ldec_path:
        # La fracción local de 3×3 píxeles refleja puntos con y sin retornos LOLA.
        with rasterio.open(fine.ldec_path) as ds:
            x, y = project(ds, lon, lat)
            inv = ~ds.transform
            col, row = inv @ (x, y)
            col, row = round(col - 0.5), round(row - 0.5)
            counts = np.ma.asarray(
                ds.read(1, window=Window(col - 1, row - 1, 3, 3), boundless=True, masked=True),
                dtype=np.float64,
            ).filled(np.nan)
        valid = np.isfinite(counts)
        if valid.any():
            interpolated_fraction = float(np.mean(counts[valid] <= 0))
            if interpolated_fraction > 0.5:
                warnings.append("More than half of nearby DEM pixels have no direct LOLA returns.")
    else:
        warnings.append(
            "LOLA return-count layer is unavailable; interpolation fraction is unknown."
        )
    if interpolated_fraction is None:
        return terrain_pb2.Coverage(
            layers=[layer.id for layer in found], near_res_m=fine.resolution_m, warnings=warnings
        )
    return terrain_pb2.Coverage(
        layers=[layer.id for layer in found],
        near_res_m=fine.resolution_m,
        interpolated_fraction=interpolated_fraction,
        warnings=warnings,
    )


def terrain_point(lat: float, lon: float) -> tuple[float, float]:
    """(altura m sobre esfera de 1737.4 km, pendiente °) en el punto."""
    height, layer = sample_height(lat, lon)
    if layer.slope_path:
        slope = _one(layer, lat, lon, layer.slope_path)
        if np.isfinite(slope):
            return height, slope
    # Pendiente local por diferencias centradas en la proyección del raster.
    from pyproj import Transformer

    from lumen_engine.dem.index import LUNAR_GEOGRAPHIC, metric_crs

    with layer.open() as ds:
        crs = metric_crs(ds.crs, lat, lon)
        to_meters = Transformer.from_crs(LUNAR_GEOGRAPHIC, crs, always_xy=True)
        x, y = to_meters.transform(lon, lat)
        back = Transformer.from_crs(crs, LUNAR_GEOGRAPHIC, always_xy=True)
        step = layer.resolution_m
        lons, lats = back.transform([x + step, x - step, x, x], [y, y, y + step, y - step])
    heights = read_points(layer, np.asarray(lons), np.asarray(lats))
    if not np.isfinite(heights).all():
        return height, float("nan")
    dzdx = (heights[0] - heights[1]) / (2 * step)
    dzdy = (heights[2] - heights[3]) / (2 * step)
    return height, float(np.degrees(np.arctan(np.hypot(dzdx, dzdy))))
