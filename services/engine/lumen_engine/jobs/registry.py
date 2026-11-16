"""Registro en memoria de jobs genéricos (export, ...). Hilo-seguro, conserva los últimos 64.

Los jobs de búsqueda (`search-*`) viven en `search.jobs`; `JobService` delega en ellos.
"""

import threading
import uuid
from collections import OrderedDict
from dataclasses import dataclass

from lumen.v1 import jobs_pb2

from lumen_engine.core.errors import NotFoundError

MAX_JOBS = 64


@dataclass
class JobRecord:
    state: int = jobs_pb2.JOB_STATE_QUEUED
    progress: float = 0.0
    stage: str = "queued"
    error: str | None = None


class JobRegistry:
    def __init__(self, max_jobs: int = MAX_JOBS) -> None:
        self._max = max_jobs
        self._jobs: OrderedDict[str, JobRecord] = OrderedDict()
        self._lock = threading.Lock()

    def create(self, prefix: str) -> str:
        job_id = f"{prefix}-{uuid.uuid4().hex}"
        with self._lock:
            self._jobs[job_id] = JobRecord()
            while len(self._jobs) > self._max:
                self._jobs.popitem(last=False)
        return job_id

    def update(
        self,
        job_id: str,
        *,
        state: int,
        progress: float,
        stage: str,
        error: str | None = None,
    ) -> None:
        with self._lock:
            rec = self._jobs.get(job_id)
            if rec is not None:
                rec.state, rec.progress, rec.stage, rec.error = state, progress, stage, error

    def get(self, job_id: str) -> jobs_pb2.GetJobResponse:
        with self._lock:
            rec = self._jobs.get(job_id)
            snap = None if rec is None else JobRecord(rec.state, rec.progress, rec.stage, rec.error)
        if snap is None:
            raise NotFoundError("JOB_NOT_FOUND", "Job not found.", {"job_id": job_id})
        return jobs_pb2.GetJobResponse(
            job_id=job_id,
            state=snap.state,  # type: ignore[arg-type]
            progress=snap.progress,
            stage=snap.stage,
            error=snap.error,
        )


REGISTRY = JobRegistry()
