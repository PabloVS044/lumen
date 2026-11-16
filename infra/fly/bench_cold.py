"""Tiempo de la primera llamada a `analyze` por sitio no polar (lectura en frío del DEM global).

Ejecutar en un proceso nuevo por directorio DEM, con STORE=memory:

  DEM_INDEX_URL=data/local/dem/index.json DEM_BASE_URL=data/local/dem \\
      python infra/fly/bench_cold.py
  DEM_INDEX_URL=data/local/dem_cog/index.json DEM_BASE_URL=data/local/dem_cog \\
      python infra/fly/bench_cold.py

Imprime una línea `site<TAB>segundos` por sitio (cada sitio es una primera llamada: sin caché).
"""

from __future__ import annotations

import asyncio
import os
import time
from datetime import UTC, datetime

os.environ.setdefault("STORE", "memory")

from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import analysis_pb2, common_pb2, sites_pb2

from lumen_engine.analysis.pipeline import analyze
from lumen_engine.catalog.loader import list_sites


def _ts(d: datetime) -> Timestamp:
    t = Timestamp()
    t.FromDatetime(d)
    return t


async def main() -> None:
    rng = common_pb2.TimeRange(
        start=_ts(datetime(2027, 1, 1, tzinfo=UTC)), end=_ts(datetime(2027, 2, 1, tzinfo=UTC))
    )
    sites = [s for s in list_sites(sites_pb2.ListSitesRequest()) if s.lat > -80]
    for s in sites:
        req = analysis_pb2.AnalyzeRequest(
            site=common_pb2.Site(lat=s.lat, lon=s.lon, obs_height_m=2.0), range=rng
        )
        t0 = time.perf_counter()
        await analyze(req)
        print(f"{s.id}\t{time.perf_counter() - t0:.2f}", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
