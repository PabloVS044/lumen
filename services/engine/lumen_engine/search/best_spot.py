"""Buscador de mejor punto. Owner: R2 Geo/Datos. Sección 9.10. Se ejecuta como job."""

from lumen.v1 import search_pb2

from lumen_engine.core.errors import NotImplementedYetError


def run(req: search_pb2.FindBestSpotRequest) -> search_pb2.GetBestSpotResultResponse:
    raise NotImplementedYetError("best-spot search")
