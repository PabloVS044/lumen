"""Próximos eventos desde un instante (HU-06, CU-10: "¿cuánto falta para el sunset/Earthset?").
Owner: R3 Efemérides/Ciencia.

Necesita la máscara de horizonte del sitio (R2). Mientras `horizon.mask.compute` no esté
implementado, este cálculo propaga NOT_IMPLEMENTED: no se usa un horizonte plano en silencio.
"""

import math
from datetime import datetime, timedelta

import numpy as np
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2, ephemeris_pb2

from lumen_engine.core.constants import DEFAULT_AZ_STEP_DEG, DEFAULT_MAX_RANGE_KM, MAX_SAMPLES
from lumen_engine.ephem.spice import series
from lumen_engine.horizon import mask as horizon_mask
from lumen_engine.metrics.events import detect
from lumen_engine.visibility.compute import compute

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
    mask = horizon_mask.compute(
        site, az_step_deg=DEFAULT_AZ_STEP_DEG, max_range_km=DEFAULT_MAX_RANGE_KM
    )
    s, e = Timestamp(), Timestamp()
    s.FromDatetime(start)
    e.FromDatetime(start + timedelta(days=days))
    rng = common_pb2.TimeRange(start=s, end=e, step_minutes=_step_minutes(days))
    eph = series(site, rng, terrain_height_m=mask.observer.terrain_height_m)
    th = thresholds or common_pb2.Thresholds()
    vis = compute(eph.sun, eph.earth, np.asarray(mask.elevation_deg), mask.az_step_deg, th)
    events = detect(eph.grid, eph.earth, vis, th)
    return [ev for ev in events if not types or ev.type in types]
