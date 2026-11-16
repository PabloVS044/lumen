"""ExportService: CSV/JSON del análisis, entregado como `data:` URL (sin object storage). Owner: R1.

PDF no se genera aquí: el navegador imprime a PDF.
"""

import base64

from connectrpc.code import Code
from lumen.v1 import analysis_pb2, export_pb2, jobs_pb2
from lumen.v1.export_connect import ExportService

from lumen_engine.analysis import pipeline
from lumen_engine.core.errors import EngineError
from lumen_engine.db.store import Store
from lumen_engine.export import formats
from lumen_engine.jobs.registry import REGISTRY
from lumen_engine.rpc.context import Ctx
from lumen_engine.services import analysis as analysis_service

MAX_PAYLOAD_BYTES = 25 * 1024 * 1024


class ExportFormatUnsupportedError(EngineError):
    connect_code = Code.FAILED_PRECONDITION

    def __init__(self) -> None:
        super().__init__(
            "EXPORT_FORMAT_UNSUPPORTED",
            "PDF is generated client-side (browser print); use CSV or JSON.",
        )


class ExportTooLargeError(EngineError):
    connect_code = Code.RESOURCE_EXHAUSTED

    def __init__(self, size: int) -> None:
        super().__init__(
            "EXPORT_TOO_LARGE",
            f"Export is {size} bytes, over the {MAX_PAYLOAD_BYTES} byte limit; "
            "reduce the range or increase the step.",
        )


_FORMATS = {
    export_pb2.EXPORT_FORMAT_CSV: (formats.to_csv, "text/csv"),
    export_pb2.EXPORT_FORMAT_JSON: (formats.to_json, "application/json"),
}


class ExportServiceImpl(ExportService):
    def __init__(self, store: Store | None = None) -> None:
        self._store = store if store is not None else analysis_service.DEFAULT_STORE

    async def create_export(
        self, request: export_pb2.CreateExportRequest, ctx: Ctx
    ) -> export_pb2.CreateExportResponse:
        if request.format not in _FORMATS:
            raise ExportFormatUnsupportedError()
        encode, mime = _FORMATS[request.format]
        job_id = REGISTRY.create("export")
        running = jobs_pb2.JOB_STATE_RUNNING
        REGISTRY.update(job_id, state=running, progress=0.1, stage="analysis")
        try:
            req = analysis_pb2.AnalyzeRequest()
            req.CopyFrom(request.analysis)
            req.options.CopyFrom(
                analysis_pb2.AnalyzeOptions(
                    horizon=request.analysis.options.horizon,
                    include_series=True,
                    include_mask=request.analysis.options.include_mask,
                )
            )
            resp = await pipeline.analyze(req, self._store)
            if resp.WhichOneof("outcome") != "result":
                raise EngineError("EXPORT_NOT_READY", "Analysis was queued; retry shortly.")
            REGISTRY.update(job_id, state=running, progress=0.8, stage="encode")
            payload = encode(resp.result)
            if len(payload) > MAX_PAYLOAD_BYTES:
                raise ExportTooLargeError(len(payload))
        except Exception as e:
            REGISTRY.update(
                job_id,
                state=jobs_pb2.JOB_STATE_FAILED,
                progress=0.0,
                stage="failed",
                error=getattr(e, "message", None) or str(e),
            )
            raise
        REGISTRY.update(job_id, state=jobs_pb2.JOB_STATE_DONE, progress=1.0, stage="done")
        url = f"data:{mime};base64,{base64.b64encode(payload).decode()}"
        return export_pb2.CreateExportResponse(job_id=job_id, download_url=url)
