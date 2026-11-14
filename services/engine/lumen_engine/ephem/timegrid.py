"""Malla temporal UTC/ET para las series (secciones 9.1 y 10.2). Owner: R3 Efemérides/Ciencia.

Los instantes son UTC equiespaciados (paso del usuario). La conversión a ET (TDB) la hace SPICE
con la LSK, así que respeta segundos intercalares si los hubiera dentro del rango.
"""

from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
import numpy.typing as npt
import spiceypy as sp
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2

from lumen_engine.core.config import get_settings
from lumen_engine.core.constants import MAX_SAMPLES
from lumen_engine.core.defaults import step_minutes
from lumen_engine.core.errors import EngineError
from lumen_engine.ephem.kernels import check_coverage, load_kernels


@dataclass(frozen=True)
class TimeGrid:
    utc: npt.NDArray[np.datetime64]  # datetime64[s], UTC
    et: npt.NDArray[np.float64]  # segundos TDB desde J2000
    step_minutes: int

    def __len__(self) -> int:
        return int(self.utc.size)

    def window(self, start: int, stop: int) -> "TimeGrid":
        """Sub-malla [start, stop) con el mismo paso."""
        return TimeGrid(self.utc[start:stop], self.et[start:stop], self.step_minutes)

    def datetimes(self) -> list[datetime]:
        return [t.astype("datetime64[us]").item().replace(tzinfo=UTC) for t in self.utc]


def _to_utc(ts: Timestamp) -> datetime:
    return ts.ToDatetime(tzinfo=UTC)


def build_grid(time_range: common_pb2.TimeRange) -> TimeGrid:
    """Instantes [start, end] cada `step_minutes` (0 = 30), validados contra límites y kernels."""
    start, end = _to_utc(time_range.start), _to_utc(time_range.end)
    step = step_minutes(time_range)
    max_days = get_settings().max_range_days
    if (end - start).total_seconds() > max_days * 86_400:
        raise EngineError(
            "RANGE_TOO_LONG",
            f"Time range exceeds {max_days} days.",
            {"max_days": str(max_days)},
        )
    n = int((end - start).total_seconds() // (step * 60)) + 1
    if n > MAX_SAMPLES:
        raise EngineError(
            "TOO_MANY_SAMPLES",
            f"Range and step produce {n} samples (max {MAX_SAMPLES}); use a larger step.",
            {"samples": str(n), "max_samples": str(MAX_SAMPLES)},
        )
    check_coverage(start, end)
    load_kernels()

    t0 = np.datetime64(start.replace(tzinfo=None), "s")
    utc = t0 + np.arange(n) * np.timedelta64(step * 60, "s")
    et = np.asarray(sp.str2et([str(t) for t in utc]), dtype=np.float64)
    return TimeGrid(utc=utc, et=et, step_minutes=step)
