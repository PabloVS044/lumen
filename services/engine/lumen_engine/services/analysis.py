"""AnalysisService. Owner: R1 (orquestación).

La caché vive detrás del puerto `db.store.Store`. Por defecto un `InMemoryStore` de proceso;
otra implementación (Postgres) se inyecta con `AnalysisServiceImpl(store=...)`.
"""

from lumen.v1 import analysis_pb2
from lumen.v1.analysis_connect import AnalysisService

from lumen_engine.analysis import pipeline
from lumen_engine.core.errors import EngineError
from lumen_engine.db.store import InMemoryStore, Store
from lumen_engine.metrics.score import best_by_metric
from lumen_engine.rpc.context import Ctx

DEFAULT_STORE: Store = InMemoryStore()


class AnalysisServiceImpl(AnalysisService):
    def __init__(self, store: Store | None = None) -> None:
        self._store = store if store is not None else DEFAULT_STORE

    async def analyze(
        self, request: analysis_pb2.AnalyzeRequest, ctx: Ctx
    ) -> analysis_pb2.AnalyzeResponse:
        return await pipeline.analyze(request, self._store)

    async def compare(
        self, request: analysis_pb2.CompareRequest, ctx: Ctx
    ) -> analysis_pb2.CompareResponse:
        """2–4 escenarios en el orden pedido, con series y máscara (mini-gráficos del comparador).

        Se calculan en secuencia: comparten el hilo de SPICE y, si repiten sitio, el horizonte
        en caché. `best_by_metric` usa la dirección de `metrics.score.HIGHER_IS_BETTER`.
        """
        options = analysis_pb2.AnalyzeOptions(include_series=True, include_mask=True)
        results = []
        for index, sc in enumerate(request.scenarios):
            req = analysis_pb2.AnalyzeRequest(
                site=sc.site, range=sc.range, thresholds=request.thresholds, options=options
            )
            try:
                res = await pipeline.analyze(req, self._store)
            except EngineError as exc:
                exc.context["scenario"] = str(index)  # qué escenario falló (base 0)
                raise
            results.append(res.result)
        best = best_by_metric([r.metrics for r in results])
        return analysis_pb2.CompareResponse(results=results, best_by_metric=best)
