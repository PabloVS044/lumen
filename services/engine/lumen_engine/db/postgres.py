"""Store real sobre PostgreSQL (psycopg 3). Owner: R1.

Atajo de hackathon: sin Alembic; `ensure_schema()` es idempotente (CREATE TABLE IF NOT EXISTS) y se
llama al construir. Una conexión por operación vía `psycopg_pool.ConnectionPool` (thread-safe).
Debe pasar `tests/contracts/store_contract.py`, igual que `InMemoryStore`.
"""

from psycopg_pool import ConnectionPool

_TABLES = {"horizon": "horizon_masks", "analysis": "analyses"}


class PostgresStore:
    def __init__(self, database_url: str, *, max_size: int = 10) -> None:
        self._pool = ConnectionPool(database_url, min_size=1, max_size=max_size, open=True)
        self._pool.wait(timeout=10)
        self.ensure_schema()

    def ensure_schema(self) -> None:
        with self._pool.connection() as conn:
            # Lock de aviso: dos procesos creando las tablas a la vez chocan en el catálogo.
            conn.execute("SELECT pg_advisory_xact_lock(7305001)")
            for table in _TABLES.values():
                conn.execute(
                    f"CREATE TABLE IF NOT EXISTS {table} ("
                    "key text PRIMARY KEY, payload bytea NOT NULL, "
                    "created_at timestamptz NOT NULL DEFAULT now())"
                )

    def close(self) -> None:
        self._pool.close()

    def _get(self, kind: str, key: str) -> bytes | None:
        with self._pool.connection() as conn:
            row = conn.execute(
                f"SELECT payload FROM {_TABLES[kind]} WHERE key = %s",
                (key,),
            ).fetchone()
        return None if row is None else bytes(row[0])

    def _put(self, kind: str, key: str, payload: bytes) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                f"INSERT INTO {_TABLES[kind]} (key, payload) VALUES (%s, %s) "
                "ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, created_at = now()",
                (key, payload),
            )

    def get_horizon(self, key: str) -> bytes | None:
        return self._get("horizon", key)

    def put_horizon(self, key: str, payload: bytes) -> None:
        self._put("horizon", key, payload)

    def get_analysis(self, key: str) -> bytes | None:
        return self._get("analysis", key)

    def put_analysis(self, key: str, payload: bytes) -> None:
        self._put("analysis", key, payload)
