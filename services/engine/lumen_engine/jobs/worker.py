"""Cola de jobs (arq + Redis). Owner: Backend/Infra. ADR-06, sección 11.3.

`arq lumen_engine.jobs.worker.WorkerSettings`
"""

from typing import Any, ClassVar


async def analyze_job(ctx: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    raise NotImplementedError


class WorkerSettings:
    functions: ClassVar[list[Any]] = [analyze_job]
