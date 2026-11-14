"""Efemérides Sol/Tierra con SPICE (DE440). Owner: R3 Efemérides/Ciencia. Sección 9.4.

Marco: MOON_ME. Aberración: LT+S. Validar contra Horizons (sección 14.1, tolerancia ≤ 0.01°).
"""

from datetime import datetime

from lumen.v1 import common_pb2, ephemeris_pb2

from lumen_engine.core.errors import NotImplementedYetError


def load_kernels() -> list[str]:
    """furnsh de los kernels de settings.kernels_dir; devuelve nombres cargados."""
    raise NotImplementedYetError("SPICE kernel loading")


def series(
    site: common_pb2.Site, time_range: common_pb2.TimeRange
) -> ephemeris_pb2.GetSeriesResponse:
    """az/el/dist de Sol y Tierra para cada instante del rango."""
    raise NotImplementedYetError("ephemeris series")


def state(t: datetime) -> ephemeris_pb2.GetStateResponse:
    """Direcciones unitarias Sol/Tierra en MOON_ME (para iluminar el globo 3D)."""
    raise NotImplementedYetError("ephemeris state")
