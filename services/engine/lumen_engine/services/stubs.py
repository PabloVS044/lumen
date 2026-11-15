"""Servicios aún sin lógica: heredan el stub generado (responden UNIMPLEMENTED).
Al implementar uno, muévelo a su propio archivo (services/<area>.py) en el PR de su owner."""

from lumen.v1 import jobs_pb2
from lumen.v1.export_connect import ExportService
from lumen.v1.jobs_connect import JobService

from lumen_engine.core.errors import NotImplementedYetError
from lumen_engine.rpc.context import Ctx
from lumen_engine.search.jobs import status as search_status


class JobServiceImpl(JobService):  # R1
    async def get_job(self, request: jobs_pb2.GetJobRequest, ctx: Ctx) -> jobs_pb2.GetJobResponse:
        if request.job_id.startswith("search-"):
            return search_status(request.job_id)
        raise NotImplementedYetError("job status")


class ExportServiceImpl(ExportService):  # R1
    pass
