"""Jobs de búsqueda en proceso. Owner: R2; R1 podrá migrarlos a Redis (ADR-06)."""

import threading
import uuid
from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass

from connectrpc.code import Code
from lumen.v1 import jobs_pb2, search_pb2

from lumen_engine.core.errors import EngineError, NotFoundError
from lumen_engine.ephem.spice import EphemerisSeries
from lumen_engine.search.best_spot import run

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="best-spot")
_lock = threading.Lock()


@dataclass
class SearchJob:
    future: Future[search_pb2.GetBestSpotResultResponse]
    progress: float = 0.0
    stage: str = "queued"


_jobs: dict[str, SearchJob] = {}


class JobNotReadyError(EngineError):
    connect_code = Code.FAILED_PRECONDITION

    def __init__(self, job_id: str) -> None:
        super().__init__("JOB_NOT_READY", "Search job has not completed.", {"job_id": job_id})


class SearchQueueFullError(EngineError):
    connect_code = Code.RESOURCE_EXHAUSTED

    def __init__(self) -> None:
        super().__init__("SEARCH_QUEUE_FULL", "Search queue is full; retry later.")


def submit(req: search_pb2.FindBestSpotRequest, eph: EphemerisSeries) -> str:
    job_id = f"search-{uuid.uuid4().hex}"
    copied = search_pb2.FindBestSpotRequest()
    copied.CopyFrom(req)

    def progress(fraction: float, stage: str) -> None:
        with _lock:
            job = _jobs[job_id]
            job.progress = fraction
            job.stage = stage

    with _lock:
        # Los terminados más antiguos se descartan al superar el límite local.
        for old_id in list(_jobs):
            if len(_jobs) < 32:
                break
            if _jobs[old_id].future.done():
                del _jobs[old_id]
        if len(_jobs) >= 32:
            raise SearchQueueFullError()
        future = _executor.submit(run, copied, eph, progress)
        _jobs[job_id] = SearchJob(future)
    return job_id


def _job(job_id: str) -> SearchJob:
    with _lock:
        job = _jobs.get(job_id)
    if job is None:
        raise NotFoundError("JOB_NOT_FOUND", "Search job not found.", {"job_id": job_id})
    return job


def status(job_id: str) -> jobs_pb2.GetJobResponse:
    job = _job(job_id)
    if job.future.done():
        error = job.future.exception()
        if error is not None:
            return jobs_pb2.GetJobResponse(
                job_id=job_id,
                state=jobs_pb2.JOB_STATE_FAILED,
                progress=job.progress,
                stage=job.stage,
                error=str(error),
            )
        return jobs_pb2.GetJobResponse(
            job_id=job_id, state=jobs_pb2.JOB_STATE_DONE, progress=1.0, stage="done"
        )
    with _lock:
        return jobs_pb2.GetJobResponse(
            job_id=job_id,
            state=jobs_pb2.JOB_STATE_RUNNING if job.progress > 0 else jobs_pb2.JOB_STATE_QUEUED,
            progress=job.progress,
            stage=job.stage,
        )


def result(job_id: str) -> search_pb2.GetBestSpotResultResponse:
    job = _job(job_id)
    if not job.future.done():
        raise JobNotReadyError(job_id)
    return job.future.result()
