"""Warmup del catálogo: calienta el horizonte de cada sitio en el Store compartido."""

import asyncio
import time
from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from lumen.v1 import analysis_pb2, sites_pb2
from starlette.testclient import TestClient

from lumen_engine.analysis import pipeline, warmup
from lumen_engine.analysis.cache_key import dem_version, horizon_cache_key
from lumen_engine.analysis.warmup import warm_catalog
from lumen_engine.catalog.loader import list_sites
from lumen_engine.core.config import get_settings
from lumen_engine.core.constants import (
    DEFAULT_AZ_STEP_DEG,
    DEFAULT_MAX_RANGE_KM,
    DEFAULT_OBS_HEIGHT_M,
)
from lumen_engine.core.errors import EngineError
from lumen_engine.db.store import InMemoryStore
from lumen_engine.main import create_app


def _site(site_id: str) -> sites_pb2.CatalogSite:
    return next(s for s in list_sites(sites_pb2.ListSitesRequest()) if s.id == site_id)


def _fake_site(site_id: str) -> sites_pb2.CatalogSite:
    return sites_pb2.CatalogSite(id=site_id, name=site_id, lat=-89.4403, lon=-137.134)


def _horizon_key(site: sites_pb2.CatalogSite) -> str:
    return horizon_cache_key(
        site.lat,
        site.lon,
        obs_height_m=DEFAULT_OBS_HEIGHT_M,
        az_step_deg=DEFAULT_AZ_STEP_DEG,
        max_range_km=DEFAULT_MAX_RANGE_KM,
        dem_version=dem_version(),
    )


@pytest.fixture(autouse=True)
def _clear_settings() -> Iterator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_report_records_ok_and_failed_codes(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sin datos reales: pipeline simulado, solo comprueba el contrato del reporte."""

    async def fake(req: analysis_pb2.AnalyzeRequest, store: object = None) -> object:
        if req.site.lat > -80:
            raise EngineError("NO_COVERAGE", "none")
        return analysis_pb2.AnalyzeResponse()

    monkeypatch.setattr(pipeline, "analyze", fake)
    good = _fake_site("good")
    bad = sites_pb2.CatalogSite(id="bad", name="bad", lat=0.0, lon=0.0)
    report = asyncio.run(warm_catalog(InMemoryStore(), sites=[good, bad]))
    assert report.ok == ["good"]
    assert report.failed == {"bad": "NO_COVERAGE"}


def test_unexpected_exception_does_not_raise(monkeypatch: pytest.MonkeyPatch) -> None:
    async def boom(req: object, store: object = None) -> object:
        raise RuntimeError("x")

    monkeypatch.setattr(pipeline, "analyze", boom)
    report = asyncio.run(warm_catalog(InMemoryStore(), sites=[_fake_site("a")]))
    assert report.failed == {"a": "INTERNAL"}


def test_request_is_one_day_hourly_from_today(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[analysis_pb2.AnalyzeRequest] = []

    async def spy(req: analysis_pb2.AnalyzeRequest, store: object = None) -> object:
        seen.append(req)
        return analysis_pb2.AnalyzeResponse()

    monkeypatch.setattr(pipeline, "analyze", spy)
    asyncio.run(warm_catalog(InMemoryStore(), sites=[_fake_site("a")]))
    (req,) = seen
    start, end = req.range.start.ToDatetime(tzinfo=UTC), req.range.end.ToDatetime(tzinfo=UTC)
    assert (start.hour, start.minute) == (0, 0)
    assert start.date() == datetime.now(UTC).date()
    assert (end - start).days == 1
    assert req.range.step_minutes == 60
    assert not req.options.include_series
    assert not req.options.include_mask


@pytest.mark.requires_kernels
@pytest.mark.requires_dem
def test_warmup_caches_horizon_and_later_range_hits() -> None:
    store = InMemoryStore()
    ok = _site("pgda-site01")
    bad = sites_pb2.CatalogSite(id="nowhere", name="nowhere", lat=89.9, lon=0.0)
    report = asyncio.run(warm_catalog(store, sites=[ok, bad]))
    assert report.ok == ["pgda-site01"]
    assert list(report.failed) == ["nowhere"]
    assert report.failed["nowhere"] == "INSUFFICIENT_DEM_RANGE"
    assert store.get_horizon(_horizon_key(ok)) is not None

    req = analysis_pb2.AnalyzeRequest(
        site={"lat": ok.lat, "lon": ok.lon}, range={"step_minutes": 60}
    )
    req.range.start.FromDatetime(datetime(2027, 3, 1, tzinfo=UTC))
    req.range.end.FromDatetime(datetime(2027, 3, 3, tzinfo=UTC))
    res = asyncio.run(pipeline.analyze(req, store))
    assert res.result.meta.cache_hit is True


def test_startup_with_warmup_does_not_block_healthz(monkeypatch: pytest.MonkeyPatch) -> None:
    cancelled: list[bool] = []

    async def slow(store: object, *, sites: object = None) -> object:
        try:
            await asyncio.sleep(30)
        except asyncio.CancelledError:
            cancelled.append(True)
            raise
        return None

    monkeypatch.setattr(warmup, "warm_catalog", slow)
    monkeypatch.setenv("WARMUP", "1")
    get_settings.cache_clear()
    t0 = time.perf_counter()
    with TestClient(create_app()) as client:
        assert client.get("/healthz").status_code == 200
        assert time.perf_counter() - t0 < 5
    assert cancelled == [True]


def test_warmup_off_by_default(monkeypatch: pytest.MonkeyPatch) -> None:
    called: list[bool] = []

    async def spy(store: object, *, sites: object = None) -> object:
        called.append(True)
        return None

    monkeypatch.setattr(warmup, "warm_catalog", spy)
    monkeypatch.delenv("WARMUP", raising=False)
    get_settings.cache_clear()
    with TestClient(create_app()) as client:
        assert client.get("/healthz").status_code == 200
    assert called == []
