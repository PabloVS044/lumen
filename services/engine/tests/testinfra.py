"""Helpers para tests que necesitan un servicio real (patrón chassis testinfra).

En local un servicio caído salta el test; con CI definido, falla (un skip dejaría el job en verde
sin haber corrido nada).
"""

import os
from typing import NoReturn

import pytest


def unreachable(what: str, err: object) -> NoReturn:
    if os.environ.get("CI"):
        pytest.fail(f"{what} is not reachable in CI, so the tests that need it did not run: {err}")
    pytest.skip(f"{what} not reachable: {err}")
