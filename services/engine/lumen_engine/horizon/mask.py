"""Máscara de horizonte por ray-casting. Owner: R2 Geo/Datos. Sección 9.3."""

from lumen.v1 import common_pb2, horizon_pb2

from lumen_engine.core.errors import NotImplementedYetError


def compute(
    site: common_pb2.Site, *, az_step_deg: float, max_range_km: float
) -> horizon_pb2.HorizonMask:
    """Elevación máxima del terreno por azimut + distancia al obstáculo.

    Implementación esperada: numba `prange` sobre azimuts, capas multi-resolución
    (5 m hasta ~10 km, luego 20-120 m), interpolación bilineal, curvatura exacta
    (`geometry.terrain_elevation_angle`).
    """
    raise NotImplementedYetError("horizon mask")
