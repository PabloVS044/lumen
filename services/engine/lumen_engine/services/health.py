"""HealthService. Owner: R1."""

from lumen.v1 import health_pb2
from lumen.v1.health_connect import HealthService

from lumen_engine import __version__
from lumen_engine.rpc.context import Ctx


class HealthServiceImpl(HealthService):
    async def check(self, request: health_pb2.CheckRequest, ctx: Ctx) -> health_pb2.CheckResponse:
        # TODO(R1): reportar kernels cargados (ephem) y capas DEM (dem) cuando existan.
        return health_pb2.CheckResponse(
            status=health_pb2.CheckResponse.STATUS_OK, version=__version__
        )
