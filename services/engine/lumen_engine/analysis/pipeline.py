"""Pipeline completo de análisis (sección 9.1). Owner: R1.

Orquesta: rango/kernels -> dem.coverage -> horizon.mask (caché) -> ephem -> visibility -> metrics
-> events. Cada paso vive en el módulo de su owner; aquí solo se componen.

Atajo de hackathon: el análisis se calcula de forma **síncrona** dentro del request y siempre
devuelve `AnalyzeResponse.result`; no se encola en `JobService` (ADR-06) aunque no haya caché.
Con la máscara de horizonte en caché un año horario tarda unos segundos; el primer horizonte de un
sitio (ray-casting a 200 km) es la parte cara.

Hilos: SPICE no es thread-safe y corre en su hilo dedicado (`run_spice`); la lectura de DEM, el
ray-casting y el store (síncrono) van a `asyncio.to_thread` para no bloquear el event loop.
"""

import asyncio
import time
from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import analysis_pb2, common_pb2, horizon_pb2, terrain_pb2

from lumen_engine import __version__
from lumen_engine.analysis.cache_key import analysis_cache_key, dem_version, horizon_cache_key
from lumen_engine.core.constants import DEFAULT_AZ_STEP_DEG, DEFAULT_MAX_RANGE_KM
from lumen_engine.core.defaults import normalize_lon, obs_height
from lumen_engine.db.store import Store
from lumen_engine.dem import coverage as dem
from lumen_engine.ephem import spice
from lumen_engine.ephem.kernels import load_kernels, run_spice
from lumen_engine.ephem.timegrid import TimeGrid, build_grid
from lumen_engine.horizon import mask as horizon_mask
from lumen_engine.metrics import compute as metrics
from lumen_engine.metrics import events as metric_events
from lumen_engine.visibility import compute as visibility


@dataclass(frozen=True)
class _Params:
    site: common_pb2.Site  # lon normalizada y obs_height resuelto
    az_step_deg: float
    max_range_km: float


def _params(req: analysis_pb2.AnalyzeRequest) -> _Params:
    site = common_pb2.Site(
        lat=req.site.lat, lon=normalize_lon(req.site.lon), obs_height_m=obs_height(req.site)
    )
    opts = req.options.horizon
    return _Params(
        site=site,
        az_step_deg=opts.az_step_deg or DEFAULT_AZ_STEP_DEG,
        max_range_km=opts.max_range_km or DEFAULT_MAX_RANGE_KM,
    )


def _timestamp(t: datetime) -> Timestamp:
    ts = Timestamp()
    ts.FromDatetime(t)
    return ts


def _iso(t: datetime) -> str:
    return t.astimezone(UTC).isoformat()


def _terrain(lat: float, lon: float) -> tuple[terrain_pb2.Coverage, float]:
    """Capas que cubren el sitio (NO_COVERAGE si ninguna) y altura del terreno."""
    cov = dem.coverage(lat, lon)
    h0, _ = dem.sample_height(lat, lon)
    return cov, h0


def _ephemeris(
    grid: TimeGrid, site: common_pb2.Site, h0: float
) -> tuple[spice.BodyEphemeris, spice.BodyEphemeris, list[str]]:
    kernels = load_kernels()
    sun, earth = (
        spice.body_azel(
            target,
            grid.et,
            site.lat,
            site.lon,
            obs_height_m=site.obs_height_m,
            terrain_height_m=h0,
        )
        for target in ("SUN", "EARTH")
    )
    return sun, earth, kernels


async def _horizon(
    p: _Params, h0: float, key: str, store: Store | None
) -> tuple[horizon_pb2.HorizonMask, bool]:
    if store is not None:
        cached = await asyncio.to_thread(store.get_horizon, key)
        if cached is not None:
            return horizon_pb2.HorizonMask.FromString(cached), True
    mask = await asyncio.to_thread(
        horizon_mask.compute,
        p.site,
        az_step_deg=p.az_step_deg,
        max_range_km=p.max_range_km,
        terrain_height_m=h0,
    )
    if store is not None:
        await asyncio.to_thread(store.put_horizon, key, mask.SerializeToString())
    return mask, False


def _shape(
    result: analysis_pb2.AnalysisResult, options: analysis_pb2.AnalyzeOptions
) -> analysis_pb2.AnalysisResult:
    """Aplica `include_series` / `include_mask` sobre el resultado completo (el de la caché)."""
    if not options.include_series:
        result.ClearField("series")
    if not options.include_mask:
        result.ClearField("horizon")
    return result


def _respond(
    result: analysis_pb2.AnalysisResult,
    req: analysis_pb2.AnalyzeRequest,
    started: float,
    cache_hit: bool,
) -> analysis_pb2.AnalyzeResponse:
    m = result.meta
    meta = analysis_pb2.Meta(
        engine_version=m.engine_version,
        kernels=m.kernels,
        computed_at=m.computed_at,
        cache_hit=cache_hit,
        elapsed_ms=round((time.perf_counter() - started) * 1000),
    )
    result.meta.CopyFrom(meta)
    return analysis_pb2.AnalyzeResponse(result=_shape(result, req.options))


async def analyze(
    req: analysis_pb2.AnalyzeRequest, store: Store | None = None
) -> analysis_pb2.AnalyzeResponse:
    """Análisis completo de un sitio y rango (sección 9.1).

    Caché (sección 11.1), si hay `store`:
    - Horizonte por `horizon_cache_key` (posición redondeada a 5 m en la estereográfica polar).
    - `AnalysisResult` completo por `analysis_cache_key` (horizonte + rango + umbrales + versión).
      Se guarda siempre con series y máscara; `include_*` se aplica al responder.

    `meta.cache_hit` es true si se reutilizó el análisis o el horizonte (la parte cara);
    `meta.computed_at` es el instante del cálculo original. Un sitio a < 5 m de otro ya calculado
    comparte su horizonte y su análisis: el `site` de la respuesta conserva el del cálculo.
    """
    started = time.perf_counter()
    p = _params(req)

    # 1. Rango: límites, nº de muestras y cobertura de los kernels, antes de tocar el DEM.
    grid = await run_spice(build_grid, req.range)
    sun_min, earth_margin = visibility.resolve_thresholds(req.thresholds)

    h_key = horizon_cache_key(
        p.site.lat,
        p.site.lon,
        obs_height_m=p.site.obs_height_m,
        az_step_deg=p.az_step_deg,
        max_range_km=p.max_range_km,
        dem_version=await asyncio.to_thread(dem_version),
    )
    a_key = analysis_cache_key(
        h_key,
        start_iso=_iso(req.range.start.ToDatetime(tzinfo=UTC)),
        end_iso=_iso(req.range.end.ToDatetime(tzinfo=UTC)),
        step_minutes=grid.step_minutes,
        sun_min_fraction=sun_min,
        earth_margin_deg=earth_margin,
        engine_version=__version__,
    )
    if store is not None:
        cached = await asyncio.to_thread(store.get_analysis, a_key)
        if cached is not None:
            return _respond(analysis_pb2.AnalysisResult.FromString(cached), req, started, True)

    # 2–3. Cobertura DEM y altura del terreno; 4. máscara de horizonte (caché por sitio).
    cov, h0 = await asyncio.to_thread(_terrain, p.site.lat, p.site.lon)
    mask, horizon_hit = await _horizon(p, h0, h_key, store)

    # 5–6. Sol y Tierra desde el sitio (SPICE, hilo dedicado).
    sun, earth, kernels = await run_spice(_ephemeris, grid, p.site, h0)

    # 7–9. Visibilidad, eventos y métricas (numpy puro).
    vis = visibility.compute(
        sun,
        earth,
        np.asarray(mask.elevation_deg, dtype=np.float64),
        mask.az_step_deg,
        req.thresholds,
    )
    events = metric_events.detect(grid, earth, vis, req.thresholds)
    met = metrics.compute(grid, sun, earth, vis, events)

    result = analysis_pb2.AnalysisResult(
        site=horizon_pb2.Observer(
            lat=p.site.lat,
            lon=p.site.lon,
            terrain_height_m=h0,
            obs_height_m=p.site.obs_height_m,
        ),
        coverage=cov,
        horizon=mask,
        series=analysis_pb2.Series(
            time=[_timestamp(t) for t in grid.datetimes()],
            sun=common_pb2.BodySeries(
                az_deg=sun.az_deg.tolist(),
                el_deg=sun.el_deg.tolist(),
                fraction=vis.sun_fraction.tolist(),
                dist_km=sun.dist_km.tolist(),
            ),
            earth=common_pb2.BodySeries(
                az_deg=earth.az_deg.tolist(),
                el_deg=earth.el_deg.tolist(),
                fraction=vis.earth_fraction.tolist(),
                dist_km=earth.dist_km.tolist(),
            ),
            horizon_at_sun_deg=vis.horizon_at_sun.tolist(),
            horizon_at_earth_deg=vis.horizon_at_earth.tolist(),
            eclipse_fraction=vis.eclipse_fraction.tolist(),
            sun_visible=vis.sun_visible.tolist(),
            earth_visible=vis.earth_visible.tolist(),
            operable=vis.operable.tolist(),
        ),
        metrics=met,
        events=events,
        meta=analysis_pb2.Meta(
            engine_version=__version__,
            kernels=kernels,
            computed_at=_timestamp(datetime.now(UTC)),
        ),
    )
    if store is not None:
        await asyncio.to_thread(store.put_analysis, a_key, result.SerializeToString())
    return _respond(result, req, started, horizon_hit)
