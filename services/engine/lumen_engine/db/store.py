"""Puerto de persistencia/caché del motor (secciones 11.1–11.2). Owner: R1.

Una sola interfaz con dos implementaciones: `InMemoryStore` (tests rápidos, dev sin Postgres) y
`PostgresStore` (real). Ambas deben pasar `tests/contracts/store_contract.py` (patrón chassis).
Los payloads son protos serializados (`SerializeToString()`): el store no conoce el dominio.
Atajo de hackathon: sin tablas normalizadas de la sección 11.2; llave + payload BYTEA.
Métodos síncronos: los servicios async los llaman con `asyncio.to_thread`.
"""

import threading
from typing import Protocol


class Store(Protocol):
    def get_horizon(self, key: str) -> bytes | None: ...
    def put_horizon(self, key: str, payload: bytes) -> None:
        """Upsert idempotente: guardar dos veces la misma llave deja una fila (la última gana)."""
        ...

    def get_analysis(self, key: str) -> bytes | None: ...
    def put_analysis(self, key: str, payload: bytes) -> None: ...


class InMemoryStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._horizon: dict[str, bytes] = {}
        self._analysis: dict[str, bytes] = {}

    def get_horizon(self, key: str) -> bytes | None:
        with self._lock:
            return self._horizon.get(key)

    def put_horizon(self, key: str, payload: bytes) -> None:
        with self._lock:
            self._horizon[key] = payload

    def get_analysis(self, key: str) -> bytes | None:
        with self._lock:
            return self._analysis.get(key)

    def put_analysis(self, key: str, payload: bytes) -> None:
        with self._lock:
            self._analysis[key] = payload
