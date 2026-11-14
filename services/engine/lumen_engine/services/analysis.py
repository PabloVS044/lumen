"""AnalysisService. Owner: R1 (orquestación)."""

from lumen.v1 import analysis_pb2
from lumen.v1.analysis_connect import AnalysisService

from lumen_engine.analysis import pipeline
from lumen_engine.rpc.context import Ctx


class AnalysisServiceImpl(AnalysisService):
    async def analyze(
        self, request: analysis_pb2.AnalyzeRequest, ctx: Ctx
    ) -> analysis_pb2.AnalyzeResponse:
        return pipeline.analyze(request)

    # compare: sin implementar.
