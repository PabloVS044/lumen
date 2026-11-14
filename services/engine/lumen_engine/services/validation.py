"""ValidationService (HU-13). Owner: R3 Efemérides/Ciencia."""

from lumen.v1 import validation_pb2
from lumen.v1.validation_connect import ValidationService

from lumen_engine.rpc.context import Ctx
from lumen_engine.validation.report import load_report


class ValidationServiceImpl(ValidationService):
    async def get_report(
        self, request: validation_pb2.GetReportRequest, ctx: Ctx
    ) -> validation_pb2.GetReportResponse:
        return load_report()
