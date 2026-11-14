"""Pipeline completo de análisis (sección 9.1). Owner: R1.

Orquesta: dem.coverage -> horizon.mask -> ephem.series -> visibility -> metrics -> events.
Cada paso vive en el módulo de su owner; aquí solo se componen.
"""

from lumen.v1 import analysis_pb2

from lumen_engine.core.errors import NotImplementedYetError


def analyze(req: analysis_pb2.AnalyzeRequest) -> analysis_pb2.AnalyzeResponse:
    raise NotImplementedYetError("analyze pipeline")
