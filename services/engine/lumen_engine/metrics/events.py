"""Eventos de salida/puesta de Sol y Tierra y eclipses (secciones 9.6 y 5.2 CU-10, HU-06).
Owner: R3 Efemérides/Ciencia.

Cada evento es un cambio de visibilidad entre dos muestras. El instante se refina interpolando
linealmente una función de margen g(t) que vale 0 justo en el umbral (g >= 0 ⇔ visible):

- Sol: g = fracción_visible − sun_min_fraction (o la fracción, si el umbral es 0).
- Tierra: g = elevación − (horizonte + earth_margin_deg).
- Eclipse: g = fracción eclipsada (el refinamiento queda a resolución del paso).
"""

from collections.abc import Iterable
from datetime import UTC, datetime, timedelta

import numpy as np
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2, ephemeris_pb2

from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.visibility.compute import BoolArray, Visibility, resolve_thresholds
from lumen_engine.visibility.disk import FloatArray

EventType = ephemeris_pb2.EventType


def _crossings(
    grid: TimeGrid, flags: BoolArray, margin: FloatArray, rise: EventType, fall: EventType
) -> list[tuple[datetime, EventType]]:
    times = grid.datetimes()
    step = timedelta(minutes=grid.step_minutes)
    out = []
    for i in np.flatnonzero(flags[1:] != flags[:-1]):
        g0, g1 = float(margin[i]), float(margin[i + 1])
        frac = g0 / (g0 - g1) if g0 != g1 else 0.0
        t = times[i] + step * float(np.clip(frac, 0.0, 1.0))
        out.append((t, rise if flags[i + 1] else fall))
    return out


def _event(t: datetime, kind: EventType) -> ephemeris_pb2.Event:
    ts = Timestamp()
    ts.FromDatetime(t)
    return ephemeris_pb2.Event(type=kind, time=ts)


def detect(
    grid: TimeGrid, earth: BodyEphemeris, vis: Visibility, thresholds: common_pb2.Thresholds
) -> list[ephemeris_pb2.Event]:
    """Todos los eventos del rango, ordenados por tiempo."""
    sun_min, earth_margin = resolve_thresholds(thresholds)
    sun_g = vis.sun_fraction - sun_min if sun_min > 0 else vis.sun_fraction
    earth_g = earth.el_deg - (vis.horizon_at_earth + earth_margin)
    found = [
        *_crossings(
            grid,
            vis.sun_visible,
            sun_g,
            ephemeris_pb2.EVENT_TYPE_SUNRISE,
            ephemeris_pb2.EVENT_TYPE_SUNSET,
        ),
        *_crossings(
            grid,
            vis.earth_visible,
            earth_g,
            ephemeris_pb2.EVENT_TYPE_EARTHRISE,
            ephemeris_pb2.EVENT_TYPE_EARTHSET,
        ),
        *_crossings(
            grid,
            vis.eclipse_fraction > 0,
            vis.eclipse_fraction,
            ephemeris_pb2.EVENT_TYPE_ECLIPSE_START,
            ephemeris_pb2.EVENT_TYPE_ECLIPSE_END,
        ),
    ]
    found.sort(key=lambda e: e[0])
    return [_event(t, kind) for t, kind in found]


def next_event(
    events: Iterable[ephemeris_pb2.Event], after: datetime, types: set[EventType]
) -> ephemeris_pb2.Event | None:
    """Primer evento de `types` estrictamente posterior a `after` (contadores de HU-06)."""
    for ev in events:
        if ev.type in types and ev.time.ToDatetime(tzinfo=UTC) > after:
            return ev
    return None
