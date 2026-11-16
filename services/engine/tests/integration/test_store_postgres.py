import os
from collections.abc import Iterator

import psycopg
import pytest

from lumen_engine.core.config import Settings
from lumen_engine.db.postgres import PostgresStore
from tests import testinfra
from tests.contracts.store_contract import StoreContract, StoreFactory

DATABASE_URL = os.environ.get("DATABASE_URL") or Settings().database_url


@pytest.fixture(scope="module")
def _db_ready() -> None:
    try:
        psycopg.connect(DATABASE_URL, connect_timeout=3).close()
    except psycopg.OperationalError as e:
        testinfra.unreachable("Postgres", e)


class TestPostgresStore(StoreContract):
    @pytest.fixture
    def make_store(self, _db_ready: None) -> Iterator[StoreFactory]:
        made: list[PostgresStore] = []

        def factory() -> PostgresStore:
            s = PostgresStore(DATABASE_URL)
            made.append(s)
            return s

        yield factory
        # Limpieza: las llaves de los tests llevan prefijo t-<uuid>.
        with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
            for table in ("horizon_masks", "analyses"):
                conn.execute(f"DELETE FROM {table} WHERE key LIKE 't-%'")
        for s in made:
            s.close()
