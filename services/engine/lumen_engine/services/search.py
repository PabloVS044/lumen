"""SearchService (M12). Owner: R2 Geo/Datos."""

from lumen.v1 import common_pb2, search_pb2
from lumen.v1.search_connect import SearchService

from lumen_engine.dem.coverage import sample_height
from lumen_engine.ephem.kernels import run_spice
from lumen_engine.ephem.spice import series
from lumen_engine.metrics.score import DEFAULT_WEIGHTS, HIGHER_IS_BETTER, score
from lumen_engine.rpc.context import Ctx
from lumen_engine.search import jobs


class SearchServiceImpl(SearchService):
    async def find_best_spot(
        self, request: search_pb2.FindBestSpotRequest, ctx: Ctx
    ) -> search_pb2.FindBestSpotResponse:
        if request.objective != "score" and request.objective not in HIGHER_IS_BETTER:
            from lumen_engine.core.errors import EngineError

            raise EngineError("UNKNOWN_METRIC", "Unknown search objective.")
        if request.objective == "score" and request.weights:
            from lumen.v1 import analysis_pb2

            score([analysis_pb2.Metrics()], dict(request.weights) or DEFAULT_WEIGHTS)
        height, _ = sample_height(request.center.lat, request.center.lon)
        center = common_pb2.Site(lat=request.center.lat, lon=request.center.lon)
        eph = await run_spice(series, center, request.range, terrain_height_m=height)
        return search_pb2.FindBestSpotResponse(
            job=common_pb2.JobRef(job_id=jobs.submit(request, eph))
        )

    async def get_best_spot_result(
        self, request: search_pb2.GetBestSpotResultRequest, ctx: Ctx
    ) -> search_pb2.GetBestSpotResultResponse:
        return jobs.result(request.job_id)
