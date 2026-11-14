import os
from typing import Any

import pytest
from starlette.testclient import TestClient

from lumen_engine.ephem.kernels import missing_kernels
from lumen_engine.main import app


class ConnectJSON:
    """Llama RPCs con el protocolo Connect (JSON unario), igual que el SDK del frontend."""

    def __init__(self, client: TestClient) -> None:
        self._client = client

    def call(self, service: str, method: str, body: dict[str, Any] | None = None) -> Any:
        return self._client.post(
            f"/lumen.v1.{service}/{method}",
            json=body or {},
            headers={"Connect-Protocol-Version": "1"},
        )


@pytest.fixture
def rpc() -> ConnectJSON:
    return ConnectJSON(TestClient(app))


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Tests marcados `requires_kernels`: se saltan en local si faltan los kernels SPICE
    (bash data/scripts/download_kernels.sh) y fallan en CI (LUMEN_REQUIRE_KERNELS=1)."""
    missing = missing_kernels()
    if not missing:
        return
    reason = f"faltan kernels SPICE: {', '.join(missing)} (bash data/scripts/download_kernels.sh)"
    needs = [item for item in items if "requires_kernels" in item.keywords]
    if needs and os.environ.get("LUMEN_REQUIRE_KERNELS") == "1":
        raise pytest.UsageError(reason)
    for item in needs:
        item.add_marker(pytest.mark.skip(reason=reason))


@pytest.fixture
def flat_horizon(monkeypatch: pytest.MonkeyPatch) -> None:
    """Sustituye la máscara de R2 por un horizonte plano (solo en tests)."""
    from lumen.v1 import horizon_pb2

    from lumen_engine.horizon import mask

    def fake(site: object, *, az_step_deg: float, max_range_km: float) -> horizon_pb2.HorizonMask:
        return horizon_pb2.HorizonMask(
            az_step_deg=1.0, elevation_deg=[0.0] * 360, observer=horizon_pb2.Observer()
        )

    monkeypatch.setattr(mask, "compute", fake)
