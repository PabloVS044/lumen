"""Warmup del catálogo: calcula (y cachea) el horizonte de cada sitio al arrancar. Owner: R1.

Un análisis de 1 día (paso horario, sin series ni máscara) por sitio basta para que la máscara de
horizonte quede en el `Store`; cualquier rango posterior sobre ese sitio la reutiliza.
Secuencial, nunca lanza: los errores por sitio se registran en el reporte.
"""

import asyncio
import logging
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from lumen.v1 import analysis_pb2, sites_pb2

from lumen_engine.analysis import pipeline
from lumen_engine.catalog.loader import list_sites
from lumen_engine.core.errors import EngineError
from lumen_engine.db.store import Store

log = logging.getLogger("lumen_engine.warmup")


@dataclass
class WarmupReport:
    ok: list[str] = field(default_factory=list)
    failed: dict[str, str] = field(default_factory=dict)  # site id -> código de error


def _request(site: sites_pb2.CatalogSite) -> analysis_pb2.AnalyzeRequest:
    start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    req = analysis_pb2.AnalyzeRequest(
        site={"lat": site.lat, "lon": site.lon},
        range={"step_minutes": 60},
        options={"include_series": False, "include_mask": False},
    )
    req.range.start.FromDatetime(start)
    req.range.end.FromDatetime(start + timedelta(days=1))
    return req


async def warm_catalog(
    store: Store, *, sites: Sequence[sites_pb2.CatalogSite] | None = None
) -> WarmupReport:
    report = WarmupReport()
    try:
        targets = list(sites) if sites is not None else list_sites(sites_pb2.ListSitesRequest())
    except Exception:
        log.exception("warmup: could not load the catalog")
        return report
    total = len(targets)
    log.info("warmup start", extra={"sites": total})
    for i, site in enumerate(targets, start=1):
        try:
            await pipeline.analyze(_request(site), store)
        except asyncio.CancelledError:
            raise
        except EngineError as e:
            report.failed[site.id] = e.code
            log.warning("warmup %d/%d %s failed: %s", i, total, site.id, e.code)
        except Exception:
            report.failed[site.id] = "INTERNAL"
            log.exception("warmup %d/%d %s failed unexpectedly", i, total, site.id)
        else:
            report.ok.append(site.id)
            log.info("warmup %d/%d %s ok", i, total, site.id)
    log.info("warmup done ok=%d failed=%d", len(report.ok), len(report.failed))
    return report
