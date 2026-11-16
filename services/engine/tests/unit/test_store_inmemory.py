import pytest

from lumen_engine.db.store import InMemoryStore
from tests.contracts.store_contract import StoreContract, StoreFactory


class TestInMemoryStore(StoreContract):
    @pytest.fixture
    def make_store(self) -> StoreFactory:
        shared = InMemoryStore()
        return lambda: shared
