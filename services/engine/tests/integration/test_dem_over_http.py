"""El DEM servido por HTTP (GDAL /vsicurl/) da exactamente lo mismo que el disco (sección 15.2).

Es la ruta de producción: `DEM_BASE_URL=https://<bucket>/dem` con COGs en R2/S3. Aquí el "bucket"
es un servidor local con soporte de Range sobre el DEM real instalado en data/local/dem, así que
se prueba el adaptador (lectura por ventanas, índice remoto, resolución de rutas) sin red externa.
No cubre lo propio de R2 (CORS, CDN, credenciales): eso solo se ve contra el bucket real.
"""

import json
import subprocess
import sys
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

import pytest
from lumen.v1 import common_pb2

from lumen_engine.core.config import get_settings
from lumen_engine.dem import coverage as dem
from lumen_engine.dem.index import load_index
from lumen_engine.horizon import mask

pytestmark = pytest.mark.requires_dem

# Cresta de Connecting ridge: cubierta por Site01 (5 m) y por el polar de 80 m.
SITE = common_pb2.Site(lat=-89.4403, lon=-137.134, obs_height_m=2.0)
SERVER = Path(__file__).with_name("range_server.py")


@dataclass
class RangeLog:
    path: Path

    def _rows(self) -> list[dict[str, object]]:
        if not self.path.exists():
            return []
        return [json.loads(line) for line in self.path.read_text().splitlines()]

    @property
    def range_requests(self) -> int:
        return sum(1 for r in self._rows() if r["range"])

    @property
    def full_get_requests(self) -> int:
        return sum(1 for r in self._rows() if not r["range"] and r["file"] != "index.json")

    @property
    def bytes_served(self) -> int:
        return sum(int(str(r["bytes"])) for r in self._rows())


def _clear_caches() -> None:
    get_settings.cache_clear()
    load_index.cache_clear()


@pytest.fixture
def local_dem_dir() -> Path:
    return Path(get_settings().dem_base_url)


@pytest.fixture
def http_dem(
    local_dem_dir: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> Iterator[tuple[str, RangeLog]]:
    log = RangeLog(tmp_path / "requests.jsonl")
    proc = subprocess.Popen(
        [sys.executable, str(SERVER), str(local_dem_dir), str(log.path)],
        stdout=subprocess.PIPE,
        text=True,
    )
    assert proc.stdout is not None
    base = f"http://127.0.0.1:{int(proc.stdout.readline())}"
    monkeypatch.setenv("DEM_BASE_URL", base)
    monkeypatch.setenv("DEM_INDEX_URL", f"{base}/index.json")
    _clear_caches()
    try:
        yield base, log
    finally:
        proc.terminate()
        proc.wait(timeout=10)
        monkeypatch.undo()
        _clear_caches()


def test_remote_index_resolves_layers_through_vsicurl(http_dem: tuple[str, RangeLog]) -> None:
    from lumen_engine.dem.index import layers

    base, _ = http_dem
    found = layers()
    assert {layer.id for layer in found} >= {"PGDA_Site01_5m", "PGDA_80S_80m"}
    assert all(layer.path.startswith(f"/vsicurl/{base}/") for layer in found)


def test_terrain_height_and_coverage_match_local_disk(
    local_dem_dir: Path, http_dem: tuple[str, RangeLog], monkeypatch: pytest.MonkeyPatch
) -> None:
    with monkeypatch.context() as local:
        local.setenv("DEM_BASE_URL", str(local_dem_dir))
        local.setenv("DEM_INDEX_URL", str(local_dem_dir / "index.json"))
        _clear_caches()
        h_local, _ = dem.sample_height(SITE.lat, SITE.lon)
        cov_local = dem.coverage(SITE.lat, SITE.lon)
    _clear_caches()

    h_http, layer = dem.sample_height(SITE.lat, SITE.lon)
    cov_http = dem.coverage(SITE.lat, SITE.lon)

    assert layer.path.startswith("/vsicurl/http://")
    assert h_http == h_local
    assert [x for x in cov_http.layers] == [x for x in cov_local.layers]
    assert cov_http.near_res_m == cov_local.near_res_m


def test_horizon_mask_over_http_equals_disk_and_reads_only_windows(
    local_dem_dir: Path, http_dem: tuple[str, RangeLog], monkeypatch: pytest.MonkeyPatch
) -> None:
    _, log = http_dem
    total_dem_bytes = sum(
        p.stat().st_size for p in local_dem_dir.glob("*.tif") if "ldec" not in p.name
    )
    with monkeypatch.context() as local:
        local.setenv("DEM_BASE_URL", str(local_dem_dir))
        local.setenv("DEM_INDEX_URL", str(local_dem_dir / "index.json"))
        _clear_caches()
        expected = mask.compute(SITE, az_step_deg=1.0, max_range_km=20.0)
    _clear_caches()

    got = mask.compute(SITE, az_step_deg=1.0, max_range_km=20.0)

    assert list(got.elevation_deg) == list(expected.elevation_deg)
    assert list(got.obstacle_distance_m) == list(expected.obstacle_distance_m)
    assert list(got.layers_used) == list(expected.layers_used)
    # Lo que justifica COG en un bucket: se piden rangos, no el archivo entero.
    assert log.range_requests > 0
    assert log.full_get_requests == 0
    assert log.bytes_served < total_dem_bytes * 0.5
