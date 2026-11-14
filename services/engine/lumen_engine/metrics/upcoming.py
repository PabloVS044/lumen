"""Próximos eventos desde un instante (HU-06, CU-10: "¿cuánto falta para el sunset/Earthset?").
Owner: R3 Efemérides/Ciencia. Necesita la máscara de horizonte (ver `visibility.site`).
"""

import math
from datetime import datetime, timedelta

from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2, ephemeris_pb2

from lumen_engine.core.constants import MAX_SAMPLES
from lumen_engine.metrics.events import detect
from lumen_engine.visibility.site import site_visibility

DEFAULT_HORIZON_DAYS = 60
_MIN_STEP_MINUTES = 10  # el instante se refina por interpolación: 10 min basta


def _step_minutes(days: int) -> int:
    return max(_MIN_STEP_MINUTES, math.ceil(days * 1440 / (MAX_SAMPLES // 2)))


def upcoming_events(
    site: common_pb2.Site,
    start: datetime,
    horizon_days: int,
    types: set[ephemeris_pb2.EventType],
    thresholds: common_pb2.Thresholds | None = None,
) -> list[ephemeris_pb2.Event]:
    """Eventos en [start, start + horizon_days] filtrados por `types` (vacío = todos)."""
    days = horizon_days or DEFAULT_HORIZON_DAYS
    s, e = Timestamp(), Timestamp()
    s.FromDatetime(start)
    e.FromDatetime(start + timedelta(days=days))
    rng = common_pb2.TimeRange(start=s, end=e, step_minutes=_step_minutes(days))
    th = thresholds or common_pb2.Thresholds()
    sv = site_visibility(site, rng, th)
    events = detect(sv.ephemeris.grid, sv.ephemeris.earth, sv.visibility, th)
    return [ev for ev in events if not types or ev.type in types]
