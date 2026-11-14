from typing import Any

import pytest
from starlette.testclient import TestClient

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
