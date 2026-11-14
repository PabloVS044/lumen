"""Índice de DEMs lunares. Owner: R2 Geo/Datos. Secciones 8.1 y 11.4."""

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.request import urlopen

import rasterio
from pyproj import CRS, Transformer
from rasterio.io import DatasetReader

from lumen_engine.core.config import get_settings
from lumen_engine.core.constants import MOON_RADIUS_M
from lumen_engine.core.errors import NoCoverageError

LUNAR_GEOGRAPHIC = CRS.from_proj4(f"+proj=longlat +R={MOON_RADIUS_M:g} +no_defs")


@dataclass(frozen=True)
class Layer:
    id: str
    path: str
    resolution_m: float
    source_url: str
    ldec_path: str | None = None
    slope_path: str | None = None
    height_scale: float = 1.0
    vertical_datum: str = "LOLA sphere R=1737400 m"

    def open(self) -> DatasetReader:
        return rasterio.open(self.path)


def _resolve(base: str, name: str | None) -> str | None:
    if name is None:
        return None
    if name.startswith(("https://", "http://")):
        return f"/vsicurl/{name}"
    if base.startswith(("https://", "http://")):
        return f"/vsicurl/{base.rstrip('/')}/{name}"
    path = Path(name)
    return str(path if path.is_absolute() else Path(base) / path)


@lru_cache(maxsize=8)
def load_index(index_url: str, base_url: str) -> tuple[Layer, ...]:
    """Lee el manifiesto; evita inventar cobertura cuando no hay datos instalados."""
    if index_url.startswith(("https://", "http://")):
        with urlopen(index_url, timeout=20) as response:
            data = json.load(response)
    else:
        path = Path(index_url)
        if not path.is_file():
            return ()
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
    if data.get("schema_version") != 1 or not isinstance(data.get("layers"), list):
        raise ValueError("DEM index must contain schema_version=1 and a layers list")
    layers = []
    for item in data["layers"]:
        layer_path = _resolve(base_url, item["file"])
        if layer_path is None:
            raise ValueError("DEM layer file is required")
        layers.append(
            Layer(
                id=item["id"],
                path=layer_path,
                resolution_m=float(item["resolution_m"]),
                source_url=item["source_url"],
                ldec_path=_resolve(base_url, item.get("ldec_file")),
                slope_path=_resolve(base_url, item.get("slope_file")),
                height_scale=float(item.get("height_scale", 1.0)),
                vertical_datum=item.get("vertical_datum", "LOLA sphere R=1737400 m"),
            )
        )
    return tuple(sorted(layers, key=lambda layer: layer.resolution_m))


def layers() -> tuple[Layer, ...]:
    settings = get_settings()
    return load_index(settings.dem_index_url, settings.dem_base_url)


def project(ds: DatasetReader, lon: float, lat: float) -> tuple[float, float]:
    if ds.crs is None:
        raise ValueError(f"DEM {ds.name} has no CRS")
    transformer = Transformer.from_crs(LUNAR_GEOGRAPHIC, ds.crs, always_xy=True)
    x, y = transformer.transform(lon, lat)
    return float(x), float(y)


def metric_crs(source: CRS, lat: float, lon: float) -> CRS:
    """La malla de búsqueda siempre usa metros, incluso con un DEM cilíndrico."""
    if not source.is_geographic:
        return source
    return CRS.from_proj4(
        f"+proj=aeqd +lat_0={lat:.10f} +lon_0={lon:.10f} +R={MOON_RADIUS_M:g} +units=m +no_defs"
    )


def covering_layers(lat: float, lon: float) -> list[Layer]:
    found = []
    for layer in layers():
        with layer.open() as ds:
            x, y = project(ds, lon, lat)
            if ds.bounds.left <= x < ds.bounds.right and ds.bounds.bottom < y <= ds.bounds.top:
                found.append(layer)
    return found


def require_coverage(lat: float, lon: float) -> list[Layer]:
    found = covering_layers(lat, lon)
    if not found:
        raise NoCoverageError(lat, lon)
    return found
