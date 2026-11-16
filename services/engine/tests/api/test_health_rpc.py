import json
import os
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest

from lumen_engine.core.config import get_settings
from lumen_engine.ephem.kernels import REQUIRED_KERNELS, missing_kernels
from tests.conftest import ConnectJSON

REAL_KERNELS_DIR = Path(__file__).resolve().parents[2] / "kernels"
LAYER_ID = "test_layer"


def _write_index(path: Path) -> None:
    index = {
        "schema_version": 1,
        "layers": [
            {
                "id": LAYER_ID,
                "file": "layer.tif",
                "resolution_m": 60.0,
                "source_url": "https://example.invalid/layer",
            }
        ],
    }
    path.write_text(json.dumps(index), encoding="utf-8")


@pytest.fixture
def configure(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Iterator[Callable[..., None]]:
    """Apunta kernels y DEM index a rutas del test y limpia la caché de settings."""
    get_settings.cache_clear()

    def apply(kernels_dir: Path, dem_index: Path | None) -> None:
        index = dem_index or tmp_path / "absent" / "index.json"
        monkeypatch.setenv("KERNELS_DIR", str(kernels_dir))
        monkeypatch.setenv("DEM_INDEX_URL", str(index))
        monkeypatch.setenv("DEM_BASE_URL", str(tmp_path))
        get_settings.cache_clear()

    yield apply
    get_settings.cache_clear()


def test_degraded_without_kernels(
    rpc: ConnectJSON, configure: Callable[..., None], tmp_path: Path
) -> None:
    empty = tmp_path / "kernels"
    empty.mkdir()
    index = tmp_path / "index.json"
    _write_index(index)
    configure(empty, index)

    r = rpc.call("HealthService", "Check")

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "STATUS_DEGRADED"
    assert body.get("kernelsLoaded", []) == []
    assert body["demLayers"] == [LAYER_ID]


def test_lists_real_kernels(
    rpc: ConnectJSON, configure: Callable[..., None], tmp_path: Path
) -> None:
    missing = missing_kernels(REAL_KERNELS_DIR)
    if missing:
        if os.environ.get("LUMEN_REQUIRE_KERNELS") == "1":
            pytest.fail(f"faltan kernels SPICE: {', '.join(missing)}")
        pytest.skip(f"faltan kernels SPICE: {', '.join(missing)}")
    index = tmp_path / "index.json"
    _write_index(index)
    configure(REAL_KERNELS_DIR, index)

    r = rpc.call("HealthService", "Check")

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "STATUS_OK"
    assert body["kernelsLoaded"] == list(REQUIRED_KERNELS)
    assert body["demLayers"] == [LAYER_ID]


def test_partial_kernels_are_listed_and_degraded(
    rpc: ConnectJSON, configure: Callable[..., None], tmp_path: Path
) -> None:
    kernels = tmp_path / "kernels"
    kernels.mkdir()
    (kernels / REQUIRED_KERNELS[0]).write_bytes(b"")
    index = tmp_path / "index.json"
    _write_index(index)
    configure(kernels, index)

    r = rpc.call("HealthService", "Check")

    body = r.json()
    assert body["status"] == "STATUS_DEGRADED"
    assert body["kernelsLoaded"] == [REQUIRED_KERNELS[0]]


def test_missing_dem_index_is_degraded_with_no_layers(
    rpc: ConnectJSON, configure: Callable[..., None], tmp_path: Path
) -> None:
    kernels = tmp_path / "kernels"
    kernels.mkdir()
    for name in REQUIRED_KERNELS:
        (kernels / name).write_bytes(b"")
    configure(kernels, None)

    r = rpc.call("HealthService", "Check")

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "STATUS_DEGRADED"
    assert body.get("demLayers", []) == []
    assert body["kernelsLoaded"] == list(REQUIRED_KERNELS)
