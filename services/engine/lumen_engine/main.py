"""App ASGI: monta un servicio Connect por área. Owner: R1.

Protocolo Connect (HTTP POST /lumen.v1.<Service>/<Method>, JSON o binario) — ADR-0012.
"""

from typing import Any

from connectrpc.server import ConnectASGIApplication
from lumen.v1.analysis_connect import AnalysisServiceASGIApplication
from lumen.v1.ephemeris_connect import EphemerisServiceASGIApplication
from lumen.v1.export_connect import ExportServiceASGIApplication
from lumen.v1.health_connect import HealthServiceASGIApplication
from lumen.v1.horizon_connect import HorizonServiceASGIApplication
from lumen.v1.jobs_connect import JobServiceASGIApplication
from lumen.v1.power_connect import PowerServiceASGIApplication
from lumen.v1.search_connect import SearchServiceASGIApplication
from lumen.v1.sites_connect import SiteServiceASGIApplication
from lumen.v1.terrain_connect import TerrainServiceASGIApplication
from lumen.v1.validation_connect import ValidationServiceASGIApplication
from lumen.v1.whatif_connect import WhatIfServiceASGIApplication
from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

from lumen_engine import __version__
from lumen_engine.core.config import get_settings
from lumen_engine.db.store import InMemoryStore, Store
from lumen_engine.rpc.interceptors import INTERCEPTORS
from lumen_engine.services.analysis import AnalysisServiceImpl
from lumen_engine.services.ephemeris import EphemerisServiceImpl
from lumen_engine.services.health import HealthServiceImpl
from lumen_engine.services.horizon import HorizonServiceImpl
from lumen_engine.services.power import PowerServiceImpl
from lumen_engine.services.search import SearchServiceImpl
from lumen_engine.services.sites import SiteServiceImpl
from lumen_engine.services.stubs import (
    ExportServiceImpl,
    JobServiceImpl,
)
from lumen_engine.services.terrain import TerrainServiceImpl
from lumen_engine.services.validation import ValidationServiceImpl
from lumen_engine.services.whatif import WhatIfServiceImpl


def build_store() -> Store:
    settings = get_settings()
    if settings.store == "postgres":
        from lumen_engine.db.postgres import PostgresStore

        return PostgresStore(settings.database_url)
    return InMemoryStore()


CONNECT_HEADERS = ["Connect-Protocol-Version", "Connect-Timeout-Ms", "Content-Type"]


async def healthz(_: Request) -> JSONResponse:
    """Liveness para infra (no es parte del contrato)."""
    return JSONResponse({"status": "ok", "version": __version__})


def create_app() -> Starlette:
    apps: list[ConnectASGIApplication[Any]] = [
        HealthServiceASGIApplication(HealthServiceImpl(), interceptors=INTERCEPTORS),
        SiteServiceASGIApplication(SiteServiceImpl(), interceptors=INTERCEPTORS),
        TerrainServiceASGIApplication(TerrainServiceImpl(), interceptors=INTERCEPTORS),
        HorizonServiceASGIApplication(HorizonServiceImpl(), interceptors=INTERCEPTORS),
        EphemerisServiceASGIApplication(EphemerisServiceImpl(), interceptors=INTERCEPTORS),
        AnalysisServiceASGIApplication(
            AnalysisServiceImpl(store=build_store()), interceptors=INTERCEPTORS
        ),
        JobServiceASGIApplication(JobServiceImpl(), interceptors=INTERCEPTORS),
        PowerServiceASGIApplication(PowerServiceImpl(), interceptors=INTERCEPTORS),
        WhatIfServiceASGIApplication(WhatIfServiceImpl(), interceptors=INTERCEPTORS),
        SearchServiceASGIApplication(SearchServiceImpl(), interceptors=INTERCEPTORS),
        ExportServiceASGIApplication(ExportServiceImpl(), interceptors=INTERCEPTORS),
        ValidationServiceASGIApplication(ValidationServiceImpl(), interceptors=INTERCEPTORS),
    ]
    routes = [Route("/healthz", healthz), *(Mount(a.path, app=a) for a in apps)]
    middleware = [
        Middleware(
            CORSMiddleware,
            allow_origins=get_settings().cors_origins,
            allow_methods=["GET", "POST"],
            allow_headers=CONNECT_HEADERS,
            expose_headers=["Grpc-Status", "Grpc-Message"],
        )
    ]
    return Starlette(routes=routes, middleware=middleware)


app = create_app()
