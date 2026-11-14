"""Lectura acotada e interpolación bilineal de COGs. Owner: R2. Sección 9.3."""

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
import rasterio
from affine import Affine
from pyproj import Transformer
from rasterio.io import DatasetReader
from rasterio.windows import Window, from_bounds

from lumen_engine.dem.index import LUNAR_GEOGRAPHIC, Layer

FloatArray = npt.NDArray[np.float64]


@dataclass(frozen=True)
class RasterWindow:
    data: FloatArray
    transform: Affine
    projector: Transformer
    periodic_origin: float | None = None

    def sample_xy(self, x: FloatArray, y: FloatArray) -> FloatArray:
        """Bilineal en centros de píxel; NaN/NoData no se interpola."""
        inv = ~self.transform
        col, row = inv @ (x, y)
        col, row = np.asarray(col) - 0.5, np.asarray(row) - 0.5
        c0 = np.floor(col).astype(np.int64)
        r0 = np.floor(row).astype(np.int64)
        ok = (c0 >= 0) & (r0 >= 0) & (c0 + 1 < self.data.shape[1]) & (r0 + 1 < self.data.shape[0])
        out = np.full(x.shape, np.nan, dtype=np.float64)
        if not np.any(ok):
            return out
        c, r = c0[ok], r0[ok]
        dc, dr = col[ok] - c, row[ok] - r
        z00, z10 = self.data[r, c], self.data[r, c + 1]
        z01, z11 = self.data[r + 1, c], self.data[r + 1, c + 1]
        out[ok] = (
            z00 * (1 - dc) * (1 - dr) + z10 * dc * (1 - dr) + z01 * (1 - dc) * dr + z11 * dc * dr
        )
        return out

    def sample(self, lon: FloatArray, lat: FloatArray) -> FloatArray:
        x, y = self.projector.transform(lon, lat)
        if self.periodic_origin is not None:
            x = self.periodic_origin + ((np.asarray(x) - self.periodic_origin + 180) % 360 - 180)
        return self.sample_xy(np.asarray(x), np.asarray(y))


def _read(ds: DatasetReader, window: Window, scale: float = 1.0) -> RasterWindow:
    window = window.round_offsets().round_lengths()
    left = max(0, int(window.col_off) - 2)
    top = max(0, int(window.row_off) - 2)
    right = min(ds.width, int(window.col_off + window.width) + 3)
    bottom = min(ds.height, int(window.row_off + window.height) + 3)
    if left >= right or top >= bottom:
        data = np.empty((0, 0), dtype=np.float64)
        clip = Window(0, 0, 0, 0)
    else:
        clip = Window(left, top, right - left, bottom - top)
        data = np.ma.asarray(ds.read(1, window=clip, masked=True), dtype=np.float64).filled(np.nan)
        data *= scale
    if ds.crs is None:
        raise ValueError(f"DEM {ds.name} has no CRS")
    return RasterWindow(
        data,
        ds.window_transform(clip),
        Transformer.from_crs(LUNAR_GEOGRAPHIC, ds.crs, always_xy=True),
    )


def _read_periodic(ds: DatasetReader, window: Window, scale: float, origin: float) -> RasterWindow:
    """Lee un intervalo continuo de longitudes aunque cruce el antimeridiano."""
    left = int(np.floor(window.col_off)) - 2
    top = max(0, int(np.floor(window.row_off)) - 2)
    right = int(np.ceil(window.col_off + window.width)) + 3
    bottom = min(ds.height, int(np.ceil(window.row_off + window.height)) + 3)
    data = np.full((max(0, bottom - top), max(0, right - left)), np.nan, dtype=np.float64)
    offset = 0
    while offset < data.shape[1]:
        source_col = (left + offset) % ds.width
        width = min(ds.width - source_col, data.shape[1] - offset)
        block = np.ma.asarray(
            ds.read(1, window=Window(source_col, top, width, data.shape[0]), masked=True),
            dtype=np.float64,
        ).filled(np.nan)
        data[:, offset : offset + width] = block * scale
        offset += width
    if ds.crs is None:
        raise ValueError(f"DEM {ds.name} has no CRS")
    return RasterWindow(
        data,
        ds.transform @ Affine.translation(left, top),
        Transformer.from_crs(LUNAR_GEOGRAPHIC, ds.crs, always_xy=True),
        origin,
    )


def _unwrap(x: FloatArray, origin: float) -> FloatArray:
    return np.asarray(origin + ((x - origin + 180) % 360 - 180), dtype=np.float64)


def read_points(
    layer: Layer, lon: FloatArray, lat: FloatArray, path: str | None = None
) -> FloatArray:
    """Lee una ventana para los puntos pedidos, sin cargar un raster completo."""
    with rasterio.open(path or layer.path) as ds:
        if ds.crs is None:
            raise ValueError(f"DEM {ds.name} has no CRS")
        transformer = Transformer.from_crs(LUNAR_GEOGRAPHIC, ds.crs, always_xy=True)
        x, y = transformer.transform(lon, lat)
        if ds.crs.is_geographic:
            origin = float(lon.flat[0])
            x = _unwrap(np.asarray(x), origin)
        window = from_bounds(
            float(np.min(x)), float(np.min(y)), float(np.max(x)), float(np.max(y)), ds.transform
        )
        scale = layer.height_scale if path is None else 1.0
        result = (
            _read_periodic(ds, window, scale, origin)
            if ds.crs.is_geographic
            else _read(ds, window, scale)
        )
        return result.sample_xy(np.asarray(x), np.asarray(y))


def read_disk(layer: Layer, lat: float, lon: float, range_m: float) -> RasterWindow:
    """Ventana que encierra el disco geodésico; exterior se resuelve con capa gruesa."""
    from lumen_engine.horizon.geometry import destination_grid

    az = np.arange(0.0, 360.0, 1.0)
    ring_lat, ring_lon = destination_grid(lat, lon, az, np.full_like(az, range_m))
    with layer.open() as ds:
        if ds.crs is None:
            raise ValueError(f"DEM {ds.name} has no CRS")
        transformer = Transformer.from_crs(LUNAR_GEOGRAPHIC, ds.crs, always_xy=True)
        x, y = transformer.transform(np.r_[ring_lon, lon], np.r_[ring_lat, lat])
        if ds.crs.is_geographic:
            x = _unwrap(np.asarray(x), lon)
        window = from_bounds(
            float(np.min(x)), float(np.min(y)), float(np.max(x)), float(np.max(y)), ds.transform
        )
        return (
            _read_periodic(ds, window, layer.height_scale, lon)
            if ds.crs.is_geographic
            else _read(ds, window, layer.height_scale)
        )
