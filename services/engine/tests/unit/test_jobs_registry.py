"""JobRegistry: estado, errores y expulsión de los más antiguos."""

import pytest
from lumen.v1 import jobs_pb2

from lumen_engine.core.errors import NotFoundError
from lumen_engine.jobs.registry import JobRegistry


def test_lifecycle_and_error() -> None:
    reg = JobRegistry()
    jid = reg.create("export")
    assert reg.get(jid).state == jobs_pb2.JOB_STATE_QUEUED
    reg.update(jid, state=jobs_pb2.JOB_STATE_FAILED, progress=0.0, stage="failed", error="x")
    got = reg.get(jid)
    assert got.state == jobs_pb2.JOB_STATE_FAILED
    assert got.error == "x"
    reg.update(jid, state=jobs_pb2.JOB_STATE_DONE, progress=1.0, stage="done")
    assert not reg.get(jid).HasField("error")


def test_evicts_oldest_beyond_limit() -> None:
    reg = JobRegistry(max_jobs=3)
    ids = [reg.create("export") for _ in range(5)]
    for old in ids[:2]:
        with pytest.raises(NotFoundError):
            reg.get(old)
    for kept in ids[2:]:
        assert reg.get(kept).job_id == kept


def test_unknown_id_raises_job_not_found() -> None:
    with pytest.raises(NotFoundError) as e:
        JobRegistry().get("nope")
    assert e.value.code == "JOB_NOT_FOUND"
