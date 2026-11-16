"""Suite de comportamiento del puerto `Store`; solo la importan los tests (patrón chassis).

Cada implementación la ejecuta heredando `StoreContract` y definiendo la fixture `make_store`
(un callable que devuelve una instancia sobre el MISMO estado compartido).
"""

import threading
import uuid
from collections.abc import Callable

import pytest

from lumen_engine.db.store import Store

StoreFactory = Callable[[], Store]


class StoreContract:
    @pytest.fixture
    def make_store(self) -> StoreFactory:
        raise NotImplementedError

    @pytest.fixture
    def store(self, make_store: StoreFactory) -> Store:
        return make_store()

    @pytest.fixture
    def key(self) -> str:
        return f"t-{uuid.uuid4().hex}"

    def test_miss_returns_none(self, store: Store, key: str) -> None:
        assert store.get_horizon(key) is None
        assert store.get_analysis(key) is None

    def test_round_trip(self, store: Store, key: str) -> None:
        store.put_horizon(key, b"h")
        store.put_analysis(key, b"a")
        assert store.get_horizon(key) == b"h"
        assert store.get_analysis(key) == b"a"

    def test_overwrite_last_wins(self, store: Store, key: str) -> None:
        store.put_horizon(key, b"one")
        store.put_horizon(key, b"two")
        store.put_analysis(key, b"one")
        store.put_analysis(key, b"two")
        assert store.get_horizon(key) == b"two"
        assert store.get_analysis(key) == b"two"

    def test_namespaces_are_independent(self, store: Store, key: str) -> None:
        store.put_horizon(key, b"only-horizon")
        assert store.get_analysis(key) is None
        store.put_analysis(key, b"only-analysis")
        assert store.get_horizon(key) == b"only-horizon"

    def test_empty_payload(self, store: Store, key: str) -> None:
        store.put_horizon(key, b"")
        assert store.get_horizon(key) == b""

    def test_all_byte_values(self, store: Store, key: str) -> None:
        data = bytes(range(256))
        store.put_analysis(key, data)
        assert store.get_analysis(key) == data

    def test_large_payload(self, store: Store, key: str) -> None:
        data = bytes(i % 251 for i in range(5 * 1024 * 1024))
        store.put_horizon(key, data)
        assert store.get_horizon(key) == data

    def test_unicode_keys(self, store: Store, key: str) -> None:
        k = f"{key}/Shackleton ñ 月面 🌑 ' \" ; --"
        store.put_horizon(k, b"u")
        assert store.get_horizon(k) == b"u"
        assert store.get_horizon(k + "x") is None

    def test_concurrent_puts_same_key_end_consistent(self, store: Store, key: str) -> None:
        payloads = [f"w{i}".encode() * 100 for i in range(8)]
        errors: list[BaseException] = []

        def work(p: bytes) -> None:
            try:
                store.put_horizon(key, p)
                store.put_analysis(key, p)
            except BaseException as e:
                errors.append(e)

        threads = [threading.Thread(target=work, args=(p,)) for p in payloads]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        assert not errors
        assert store.get_horizon(key) in payloads
        assert store.get_analysis(key) in payloads

    def test_second_instance_sees_data(self, make_store: StoreFactory, key: str) -> None:
        a, b = make_store(), make_store()
        a.put_horizon(key, b"shared")
        assert b.get_horizon(key) == b"shared"
