"""AnalysisService (Analyze, Compare) a nivel RPC, con la app ASGI real y kernels SPICE reales.

Contrato de comportamiento: se comprueba lo que ve un cliente Connect (códigos, campos, caché
transparente), nunca salidas inventadas. El terreno es un DEM sintético plano (h = 0) en la
proyección polar de LOLA (sección 14.2): con él el horizonte esperado es exactamente −dip(h_obs).
El test con DEM real (Site01 5 m) está al final y se salta si no está instalado.
"""

import base64
import json
import math
import time
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import numpy as np
import pytest
import rasterio
from lumen.v1.common_pb2 import ErrorDetail
from pyproj import CRS
from rasterio.transform import from_origin
from starlette.testclient import TestClient

from lumen_engine.core.config import get_settings
from lumen_engine.core.constants import MOON_RADIUS_M, SOUTH_POLAR_STEREO_PROJ4
from lumen_engine.db.store import InMemoryStore
from lumen_engine.dem import index
from lumen_engine.horizon import mask
from lumen_engine.main import create_app
from lumen_engine.metrics.score import HIGHER_IS_BETTER
from lumen_engine.services import analysis as analysis_service
from tests.conftest import ConnectJSON

pytestmark = pytest.mark.requires_kernels

SITE = {"lat": -89.45, "lon": -137.31}
OTHER_SITE = {"lat": -89.0, "lon": 30.0}
JAN = {"start": "2027-01-01T00:00:00Z", "end": "2027-02-01T00:00:00Z", "stepMinutes": 60}
JUL = {"start": "2027-07-01T00:00:00Z", "end": "2027-08-01T00:00:00Z", "stepMinutes": 60}
FULL = {"includeSeries": True, "includeMask": True}
HALF_WIDTH_M = 260_000.0  # cubre 200 km de horizonte desde ambos sitios (≤ 31 km del polo)
RES_M = 400.0


@pytest.fixture(scope="module")
def flat_dem(tmp_path_factory: pytest.TempPathFactory) -> Iterator[Path]:
    """DEM plano h = 0 centrado en el polo sur, en la estereográfica polar de los DEM LOLA."""
    d = tmp_path_factory.mktemp("flat_dem")
    n = round(2 * HALF_WIDTH_M / RES_M)
    profile = {
        "driver": "GTiff",
        "height": n,
        "width": n,
        "count": 1,
        "dtype": "float32",
        "crs": CRS.from_proj4(SOUTH_POLAR_STEREO_PROJ4),
        "transform": from_origin(-HALF_WIDTH_M, HALF_WIDTH_M, RES_M, RES_M),
        "nodata": np.nan,
    }
    for name, value in (("height.tif", 0.0), ("counts.tif", 1.0)):
        with rasterio.open(d / name, "w", **profile) as ds:
            ds.write(np.full((n, n), value, dtype=np.float32), 1)
    layer = {
        "id": "synthetic_flat",
        "file": "height.tif",
        "resolution_m": RES_M,
        "source_url": "synthetic (tests, sección 14.2)",
        "ldec_file": "counts.tif",
    }
    (d / "index.json").write_text(json.dumps({"schema_version": 1, "layers": [layer]}))
    with pytest.MonkeyPatch.context() as mp:
        mp.setenv("DEM_INDEX_URL", str(d / "index.json"))
        mp.setenv("DEM_BASE_URL", str(d))
        get_settings.cache_clear()
        yield d
    get_settings.cache_clear()
    index.load_index.cache_clear()


@pytest.fixture
def api(flat_dem: Path, monkeypatch: pytest.MonkeyPatch) -> ConnectJSON:
    """App ASGI real (`create_app`) con un store en memoria nuevo para cada test."""
    monkeypatch.setattr(analysis_service, "DEFAULT_STORE", InMemoryStore())
    return ConnectJSON(TestClient(create_app()))


@pytest.fixture
def horizon_calls(monkeypatch: pytest.MonkeyPatch) -> list[float]:
    """Cuenta cálculos reales del horizonte (envuelve `mask.compute`, no sustituye su salida)."""
    calls: list[float] = []
    original = mask.compute

    def counting(*args: Any, **kwargs: Any) -> Any:
        calls.append(time.perf_counter())
        return original(*args, **kwargs)

    monkeypatch.setattr(mask, "compute", counting)
    return calls


def analyze(api: ConnectJSON, **body: Any) -> Any:
    r = api.call("AnalysisService", "Analyze", {"site": SITE, "range": JAN, **body})
    assert r.status_code == 200, r.text
    return r.json()["result"]


def error_code(r: Any) -> str:
    detail = r.json()["details"][0]
    return ErrorDetail.FromString(base64.b64decode(detail["value"] + "==")).code


def dip_deg(h_obs_m: float) -> float:
    return math.degrees(math.acos(MOON_RADIUS_M / (MOON_RADIUS_M + h_obs_m)))


# (a) Caché transparente ------------------------------------------------------------------------


def test_second_analyze_is_identical_and_horizon_computed_once(
    api: ConnectJSON, horizon_calls: list[float]
) -> None:
    first = analyze(api, options=FULL)
    second = analyze(api, options=FULL)
    assert len(horizon_calls) == 1
    assert first["meta"].get("cacheHit", False) is False
    assert second["meta"]["cacheHit"] is True
    for res in (first, second):
        res["meta"].pop("cacheHit", None)
        res["meta"].pop("elapsedMs", None)
        res["meta"].pop("computedAt", None)
    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)


def test_new_range_on_same_site_reuses_horizon(
    api: ConnectJSON, horizon_calls: list[float]
) -> None:
    jan = analyze(api)
    jul = analyze(api, range=JUL)
    assert len(horizon_calls) == 1
    assert jul["meta"]["cacheHit"] is True  # horizonte reutilizado
    assert jan["metrics"] != jul["metrics"]


def test_point_within_5_m_shares_horizon_far_point_does_not(
    api: ConnectJSON, horizon_calls: list[float]
) -> None:
    analyze(api)
    analyze(api, site={"lat": SITE["lat"] - 1e-5, "lon": SITE["lon"]})  # ≈ 0.3 m
    assert len(horizon_calls) == 1
    analyze(api, site={"lat": SITE["lat"] - 1e-3, "lon": SITE["lon"]})  # ≈ 30 m
    assert len(horizon_calls) == 2


# (b) DEM sintético plano ---------------------------------------------------------------------


def test_flat_dem_horizon_is_minus_dip(api: ConnectJSON) -> None:
    res = analyze(api, site={**SITE, "obsHeightM": 2.0}, options=FULL)
    el = np.array(res["horizon"]["elevationDeg"])
    assert el.size == 1440  # 360 / 0.25
    np.testing.assert_allclose(el, -dip_deg(2.0), atol=1e-3)
    assert res["site"].get("terrainHeightM", 0.0) == 0.0
    assert res["coverage"]["layers"] == ["synthetic_flat"]


def test_flat_dem_sun_visibility_follows_sun_elevation_over_horizon(api: ConnectJSON) -> None:
    year = {"start": "2027-01-01T00:00:00Z", "end": "2028-01-01T00:00:00Z", "stepMinutes": 180}
    res = analyze(api, range=year, options=FULL)
    s = res["series"]
    el = np.array(s["sun"]["elDeg"])
    h = np.array(s["horizonAtSunDeg"])
    eclipse = np.array(s.get("eclipseFraction", [0.0] * el.size))
    visible = np.array(s["sunVisible"])
    assert el.size == len(s["time"]) == 365 * 8 + 1
    np.testing.assert_allclose(h, -dip_deg(2.0), atol=1e-3)
    clear = (eclipse == 0) & (np.abs(el - h) > 1e-9)
    np.testing.assert_array_equal(visible[clear], (el > h)[clear])
    # En el polo el Sol roza el horizonte (±1.5°): en un año hay luz y sombra
    assert 0 < visible.mean() < 1
    expected_pct = 100.0 * visible.mean()
    assert res["metrics"].get("illuminationPct", 0.0) == pytest.approx(expected_pct)
    operable = np.array(s["operable"])
    np.testing.assert_array_equal(operable, visible & np.array(s["earthVisible"]))


# (c) Errores ---------------------------------------------------------------------------------


def test_inverted_range_is_invalid_argument(api: ConnectJSON) -> None:
    rng = {"start": JAN["end"], "end": JAN["start"]}
    r = api.call("AnalysisService", "Analyze", {"site": SITE, "range": rng})
    assert r.status_code == 400
    assert r.json()["code"] == "invalid_argument"


@pytest.mark.parametrize(
    ("rng", "code"),
    [
        ({"start": "2027-01-01T00:00:00Z", "end": "2030-01-01T00:00:00Z"}, "RANGE_TOO_LONG"),
        (
            {"start": "2027-01-01T00:00:00Z", "end": "2028-12-01T00:00:00Z", "stepMinutes": 5},
            "TOO_MANY_SAMPLES",
        ),
    ],
)
def test_range_limits_are_invalid_argument(api: ConnectJSON, rng: Any, code: str) -> None:
    r = api.call("AnalysisService", "Analyze", {"site": SITE, "range": rng})
    assert r.json()["code"] == "invalid_argument"
    assert error_code(r) == code


def test_range_outside_kernels_is_out_of_range_before_touching_dem(api: ConnectJSON) -> None:
    rng = {"start": "2160-01-01T00:00:00Z", "end": "2160-02-01T00:00:00Z"}
    # Sitio ecuatorial sin DEM: el rango se valida antes que la cobertura
    r = api.call("AnalysisService", "Analyze", {"site": {"lat": 0, "lon": 0}, "range": rng})
    assert r.json()["code"] == "out_of_range"
    assert error_code(r) == "OUT_OF_EPHEMERIS_RANGE"


def test_site_without_dem_is_failed_precondition(api: ConnectJSON) -> None:
    r = api.call("AnalysisService", "Analyze", {"site": {"lat": 0, "lon": 0}, "range": JAN})
    assert r.json()["code"] == "failed_precondition"
    assert error_code(r) == "NO_COVERAGE"


# (d) Compare ---------------------------------------------------------------------------------


def test_compare_preserves_order_and_best_by_metric_is_true_optimum(api: ConnectJSON) -> None:
    scenarios: list[dict[str, Any]] = [
        {"site": SITE, "range": JAN},
        {"site": OTHER_SITE, "range": JAN},
        {"site": SITE, "range": JUL},
    ]
    r = api.call("AnalysisService", "Compare", {"scenarios": scenarios})
    assert r.status_code == 200, r.text
    body = r.json()
    results = body["results"]
    assert len(results) == 3
    for sc, res in zip(scenarios, results, strict=True):
        assert res["site"]["lat"] == pytest.approx(sc["site"]["lat"])
        assert res["series"]["time"][0] == sc["range"]["start"]
    best = body["bestByMetric"]
    assert set(best) == set(HIGHER_IS_BETTER)
    for name, higher in HIGHER_IS_BETTER.items():
        camel = "".join(p.capitalize() if i else p for i, p in enumerate(name.split("_")))
        values = [res["metrics"].get(camel, 0.0) for res in results]
        target = max(values) if higher else min(values)
        assert values[best[name]] == target, name
    # Que la comparación discrimine de verdad (no todo empatado)
    assert len({res["metrics"].get("illuminationPct", 0.0) for res in results}) > 1


@pytest.mark.parametrize("count", [1, 5])
def test_compare_rejects_wrong_number_of_scenarios(api: ConnectJSON, count: int) -> None:
    scenarios = [{"site": SITE, "range": JAN}] * count
    r = api.call("AnalysisService", "Compare", {"scenarios": scenarios})
    assert r.status_code == 400
    assert r.json()["code"] == "invalid_argument"


# (e) Opciones --------------------------------------------------------------------------------


def test_series_and_mask_are_omitted_unless_requested(api: ConnectJSON) -> None:
    lean = analyze(api)
    assert "series" not in lean and "horizon" not in lean
    assert "illuminationPct" in lean["metrics"]
    only_mask = analyze(api, options={"includeMask": True})
    assert "series" not in only_mask and only_mask["horizon"]["elevationDeg"]
    only_series = analyze(api, options={"includeSeries": True})
    assert "horizon" not in only_series and only_series["series"]["time"]
    assert lean["metrics"] == only_mask["metrics"] == only_series["metrics"]


def test_meta_reports_engine_and_kernels(api: ConnectJSON) -> None:
    meta = analyze(api)["meta"]
    assert meta["engineVersion"]
    assert "de440s.bsp" in meta["kernels"]
    assert meta["computedAt"]


# (f) Rendimiento -----------------------------------------------------------------------------


def test_one_year_hourly_with_warm_horizon_is_fast(api: ConnectJSON) -> None:
    analyze(api)  # calienta el horizonte
    year = {"start": "2027-01-01T00:00:00Z", "end": "2028-01-01T00:00:00Z", "stepMinutes": 60}
    t0 = time.perf_counter()
    res = analyze(api, range=year)
    elapsed = time.perf_counter() - t0
    assert elapsed < 10.0, f"1 año horario tardó {elapsed:.1f} s"
    assert res["meta"]["cacheHit"] is True


# DEM real ------------------------------------------------------------------------------------


@pytest.fixture
def real_api() -> Iterator[ConnectJSON]:
    """DEM instalado por `prepare_dem.py` (deshace el DEM sintético si este módulo lo activó)."""
    with pytest.MonkeyPatch.context() as mp:
        mp.delenv("DEM_INDEX_URL", raising=False)
        mp.delenv("DEM_BASE_URL", raising=False)
        mp.setattr(analysis_service, "DEFAULT_STORE", InMemoryStore())
        get_settings.cache_clear()
        if not index.layers():
            pytest.skip("no hay DEMs LOLA instalados (data/scripts/prepare_dem.py)")
        yield ConnectJSON(TestClient(create_app()))
    get_settings.cache_clear()


@pytest.mark.slow
@pytest.mark.requires_dem
def test_real_dem_connecting_ridge_crest_year_2027(real_api: ConnectJSON) -> None:
    """PGDA Site01 (5 m) + LDEM 80S (80 m). La cresta de la Connecting ridge debe estar muy
    iluminada (> 80 % en 2027, en el orden de lo publicado, Mazarico et al. 2011)."""
    year = {"start": "2027-01-01T00:00:00Z", "end": "2028-01-01T00:00:00Z", "stepMinutes": 60}
    crest = {"lat": -89.4403, "lon": -137.134}
    r = real_api.call("AnalysisService", "Analyze", {"site": crest, "range": year})
    assert r.status_code == 200, r.text
    res = r.json()["result"]
    assert "PGDA_Site01_5m" in res["coverage"]["layers"]
    assert res["metrics"]["illuminationPct"] > 80.0
    assert 0.0 < res["metrics"]["earthVisiblePct"] < 100.0
