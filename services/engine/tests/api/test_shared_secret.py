"""Secreto compartido BFF → motor (x-lumen-secret). Pasa por la app ASGI real."""

from collections.abc import Callable, Iterator
from typing import Any

import pytest
from starlette.testclient import TestClient

from lumen_engine.core.config import get_settings
from lumen_engine.main import create_app

SECRET = "s3cret-value"
URL = "/lumen.v1.HealthService/Check"

MakeClient = Callable[[str | None], TestClient]


@pytest.fixture
def make_client(monkeypatch: pytest.MonkeyPatch) -> Iterator[MakeClient]:
    def make(secret: str | None) -> TestClient:
        if secret is None:
            monkeypatch.delenv("ENGINE_SHARED_SECRET", raising=False)
        else:
            monkeypatch.setenv("ENGINE_SHARED_SECRET", secret)
        get_settings.cache_clear()
        return TestClient(create_app())

    yield make
    monkeypatch.undo()
    get_settings.cache_clear()


def _post(c: TestClient, headers: dict[str, str] | None = None) -> Any:
    return c.post(URL, json={}, headers={"Connect-Protocol-Version": "1", **(headers or {})})


def test_disabled_by_default(make_client: MakeClient) -> None:
    assert _post(make_client(None)).status_code == 200


def test_empty_secret_is_disabled(make_client: MakeClient) -> None:
    assert _post(make_client("")).status_code == 200


def test_missing_header_is_rejected(make_client: MakeClient) -> None:
    r = _post(make_client(SECRET))
    assert r.status_code == 401
    body = r.json()
    assert body["code"] == "unauthenticated"
    assert body["message"]
    assert r.headers["content-type"].startswith("application/json")


def test_wrong_header_is_rejected(make_client: MakeClient) -> None:
    r = _post(make_client(SECRET), {"x-lumen-secret": "nope"})
    assert r.status_code == 401
    assert SECRET not in r.text


def test_correct_header_passes(make_client: MakeClient) -> None:
    r = _post(make_client(SECRET), {"x-lumen-secret": SECRET})
    assert r.status_code == 200
    assert r.json()["version"]


def test_healthz_stays_open(make_client: MakeClient) -> None:
    assert make_client(SECRET).get("/healthz").status_code == 200


def test_cors_preflight_stays_open(make_client: MakeClient) -> None:
    r = make_client(SECRET).options(
        URL,
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert r.status_code == 200
