"""Acceso a DEMs (COG multi-resolución). Owner: R2 Geo/Datos. Secciones 8.1, 9.3, 11.4."""

from lumen.v1 import terrain_pb2

from lumen_engine.core.errors import NotImplementedYetError


def coverage(lat: float, lon: float) -> terrain_pb2.Coverage:
    """Capas que cubren (lat, lon), resolución cercana y advertencias de interpolación (LDEC=0)."""
    raise NotImplementedYetError("DEM coverage")


def terrain_point(lat: float, lon: float) -> tuple[float, float]:
    """(altura m sobre esfera de 1737.4 km, pendiente °) en el punto."""
    raise NotImplementedYetError("terrain point sampling")
