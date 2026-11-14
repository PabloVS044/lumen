"""EphemerisService. Owner: R3 Efemérides/Ciencia."""

from lumen.v1 import ephemeris_pb2
from lumen.v1.ephemeris_connect import EphemerisService

from lumen_engine.ephem import spice
from lumen_engine.rpc.context import Ctx


class EphemerisServiceImpl(EphemerisService):
    async def get_series(
        self, request: ephemeris_pb2.GetSeriesRequest, ctx: Ctx
    ) -> ephemeris_pb2.GetSeriesResponse:
        return spice.series(request.site, request.range)

    async def get_state(
        self, request: ephemeris_pb2.GetStateRequest, ctx: Ctx
    ) -> ephemeris_pb2.GetStateResponse:
        return spice.state(request.time.ToDatetime())

    # list_events: sin implementar (UNIMPLEMENTED por defecto del stub generado).
