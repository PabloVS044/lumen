"""Cobertura insuficiente del DEM: código Connect correcto y escenario identificado en Compare.

El error se inyecta en la llamada al pipeline real (no depende de qué capas DEM haya instaladas);
el caso con datos reales (Malapert con la capa global) comprueba que el motor sí lo resuelve.
"""

from typing import Any

import pytest

from lumen_engine.analysis import pipeline
from lumen_engine.core.errors import EngineError
from lumen_engine.dem.index import layers
from tests.conftest import ConnectJSON

pytestmark = pytest.mark.requires_kernels

RANGE = {"start": "2027-01-01T00:00:00Z", "end": "2027-01-08T00:00:00Z", "stepMinutes": 60}
RIDGE = {"lat": -89.4403, "lon": -137.134}
MALAPERT = {"lat": -86.0, "lon": 0.0}  # el polar de 80 m no alcanza el extremo de los rayos


@pytest.fixture
def malapert_lacks_dem(monkeypatch: pytest.MonkeyPatch) -> None:
    """Como si ninguna capa llegara al extremo de los rayos de Malapert."""
    real = pipeline.analyze

    async def analyze(req: Any, store: Any = None) -> Any:
        if req.site.lat == MALAPERT["lat"]:
            raise EngineError("INSUFFICIENT_DEM_RANGE", "No DEM layer reaches the requested range.")
        return await real(req, store)

    monkeypatch.setattr(pipeline, "analyze", analyze)


def _debug(body: dict[str, Any]) -> dict[str, Any]:
    return dict(body["details"][0]["debug"])


@pytest.mark.usefixtures("malapert_lacks_dem")
def test_insufficient_dem_range_is_a_failed_precondition(rpc: ConnectJSON) -> None:
    r = rpc.call("AnalysisService", "Analyze", {"site": MALAPERT, "range": RANGE})
    body = r.json()
    assert body["code"] == "failed_precondition"  # la petición es válida; faltan datos
    assert _debug(body)["code"] == "INSUFFICIENT_DEM_RANGE"


@pytest.mark.usefixtures("malapert_lacks_dem")
@pytest.mark.requires_dem
def test_compare_names_the_scenario_that_failed(rpc: ConnectJSON) -> None:
    scenarios = [{"site": RIDGE, "range": RANGE}, {"site": MALAPERT, "range": RANGE}]
    body = rpc.call("AnalysisService", "Compare", {"scenarios": scenarios}).json()
    assert body["code"] == "failed_precondition"
    debug = _debug(body)
    assert debug["code"] == "INSUFFICIENT_DEM_RANGE"
    assert debug["context"]["scenario"] == "1"  # índice base 0 del escenario que falló


@pytest.mark.requires_dem
def test_compare_still_succeeds_when_every_scenario_is_covered(rpc: ConnectJSON) -> None:
    scenarios = [{"site": RIDGE, "range": RANGE}, {"site": RIDGE, "range": RANGE}]
    r = rpc.call("AnalysisService", "Compare", {"scenarios": scenarios})
    assert r.status_code == 200
    assert len(r.json()["results"]) == 2


@pytest.mark.requires_dem
@pytest.mark.skipif(
    not any("global" in layer.id.lower() for layer in layers()),
    reason="necesita la capa global LDEM_128 (prepare_dem.py --global)",
)
def test_malapert_is_analyzable_with_the_global_layer(rpc: ConnectJSON) -> None:
    r = rpc.call("AnalysisService", "Analyze", {"site": MALAPERT, "range": RANGE})
    assert r.status_code == 200, r.text
    result = r.json()["result"]
    assert "PDS_LOLA_global_128ppd" in str(result["coverage"])
    assert 0 <= result["metrics"]["illuminationPct"] <= 100
