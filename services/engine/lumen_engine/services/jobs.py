"""JobService: registro genérico (export) + trabajos de búsqueda `search-*`. Owner: R1."""

from lumen.v1 import jobs_pb2
from lumen.v1.jobs_connect import JobService

from lumen_engine.jobs.registry import REGISTRY
from lumen_engine.rpc.context import Ctx
from lumen_engine.search.jobs import status as search_status


class JobServiceImpl(JobService):
    async def get_job(self, request: jobs_pb2.GetJobRequest, ctx: Ctx) -> jobs_pb2.GetJobResponse:
        if request.job_id.startswith("search-"):
            return search_status(request.job_id)
        return REGISTRY.get(request.job_id)
