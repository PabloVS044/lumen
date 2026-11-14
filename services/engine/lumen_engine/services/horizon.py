"""HorizonService. Owner: R2 Geo/Datos (cálculo); caché y jobs: R1."""

from lumen.v1 import horizon_pb2
from lumen.v1.horizon_connect import HorizonService

from lumen_engine.core.constants import DEFAULT_AZ_STEP_DEG, DEFAULT_MAX_RANGE_KM
from lumen_engine.horizon import mask
from lumen_engine.rpc.context import Ctx


class HorizonServiceImpl(HorizonService):
    async def compute_horizon(
        self, request: horizon_pb2.ComputeHorizonRequest, ctx: Ctx
    ) -> horizon_pb2.ComputeHorizonResponse:
        # TODO(R1): consultar caché por key_horizon (sección 11.1) y encolar job si no existe.
        result = mask.compute(
            request.site,
            az_step_deg=request.options.az_step_deg or DEFAULT_AZ_STEP_DEG,
            max_range_km=request.options.max_range_km or DEFAULT_MAX_RANGE_KM,
        )
        return horizon_pb2.ComputeHorizonResponse(mask=result)
