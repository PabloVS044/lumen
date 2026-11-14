"""TerrainService. Owner: R2 Geo/Datos."""

from lumen.v1 import terrain_pb2
from lumen.v1.terrain_connect import TerrainService

from lumen_engine.core.defaults import normalize_lon
from lumen_engine.dem import coverage as dem
from lumen_engine.rpc.context import Ctx


class TerrainServiceImpl(TerrainService):
    async def get_coverage(
        self, request: terrain_pb2.GetCoverageRequest, ctx: Ctx
    ) -> terrain_pb2.GetCoverageResponse:
        cov = dem.coverage(request.point.lat, normalize_lon(request.point.lon))
        return terrain_pb2.GetCoverageResponse(coverage=cov)

    async def get_terrain_point(
        self, request: terrain_pb2.GetTerrainPointRequest, ctx: Ctx
    ) -> terrain_pb2.GetTerrainPointResponse:
        height, slope = dem.terrain_point(request.point.lat, normalize_lon(request.point.lon))
        return terrain_pb2.GetTerrainPointResponse(height_m=height, slope_deg=slope)
