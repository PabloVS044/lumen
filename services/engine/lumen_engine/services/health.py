"""HealthService. Owner: R1."""

import asyncio
import logging

from lumen.v1 import health_pb2
from lumen.v1.health_connect import HealthService

from lumen_engine import __version__
from lumen_engine.dem.index import layers
from lumen_engine.ephem.kernels import REQUIRED_KERNELS, kernel_paths
from lumen_engine.rpc.context import Ctx

logger = logging.getLogger(__name__)


def _present_kernels() -> list[str]:
    """Kernels requeridos que existen en disco (bloqueante: se ejecuta en un hilo)."""
    return [p.name for p in kernel_paths() if p.is_file()]


def _dem_layer_ids() -> list[str]:
    """Ids de las capas del índice DEM; sin índice, lista vacía (bloqueante)."""
    try:
        return [layer.id for layer in layers()]
    except (OSError, ValueError) as exc:
        logger.warning("DEM index unreadable: %s", exc)
        return []


class HealthServiceImpl(HealthService):
    async def check(self, request: health_pb2.CheckRequest, ctx: Ctx) -> health_pb2.CheckResponse:
        present, dem_layers = await asyncio.gather(
            asyncio.to_thread(_present_kernels), asyncio.to_thread(_dem_layer_ids)
        )
        degraded = len(present) < len(REQUIRED_KERNELS) or not dem_layers
        status = (
            health_pb2.CheckResponse.STATUS_DEGRADED
            if degraded
            else health_pb2.CheckResponse.STATUS_OK
        )
        return health_pb2.CheckResponse(
            status=status,
            version=__version__,
            kernels_loaded=present,
            dem_layers=dem_layers,
        )
