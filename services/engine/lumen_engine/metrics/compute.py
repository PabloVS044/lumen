"""Métricas de energía y comunicación de un sitio (sección 9.6). Owner: R3 Efemérides/Ciencia.

Devuelve directamente el mensaje `lumen.v1.Metrics` del contrato: sus campos son exactamente las
métricas de la sección 9.6 y duplicarlos en otra estructura no aportaría nada.
"""

from datetime import timedelta

import numpy as np
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import analysis_pb2, common_pb2, ephemeris_pb2

from lumen_engine.core.constants import AU_KM, SOLAR_CONSTANT_W_M2
from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.metrics.streaks import longest_run, run_count
from lumen_engine.visibility.compute import BoolArray, Visibility
from lumen_engine.visibility.disk import FloatArray


def _pct(flags: BoolArray) -> float:
    return float(100.0 * np.mean(flags)) if flags.size else 0.0


def _interval(grid: TimeGrid, start: int, end_excl: int) -> common_pb2.Interval:
    """[inicio, fin) de una racha; fin = inicio + longitud x paso. Truncada si toca un borde."""
    times = grid.datetimes()
    step = timedelta(minutes=grid.step_minutes)
    s, e = Timestamp(), Timestamp()
    s.FromDatetime(times[start])
    e.FromDatetime(times[start] + (end_excl - start) * step)
    return common_pb2.Interval(start=s, end=e, truncated=start == 0 or end_excl == len(grid))


def solar_irradiance_w_m2(sun_dist_km: FloatArray) -> FloatArray:
    """Irradiancia solar a la distancia del Sol (sección 9.8): S0 = 1361 · (1 UA / d)²."""
    out: FloatArray = SOLAR_CONSTANT_W_M2 * (AU_KM / sun_dist_km) ** 2
    return out


def _first_sunrise(vis: Visibility, events: list[ephemeris_pb2.Event] | None) -> Timestamp | None:
    """Si se aterriza de noche (Sol no visible al inicio), instante del primer amanecer."""
    if events is None or not vis.sun_visible.size or vis.sun_visible[0]:
        return None
    for ev in events:
        if ev.type == ephemeris_pb2.EVENT_TYPE_SUNRISE:
            return ev.time
    return None


def compute(
    grid: TimeGrid,
    sun: BodyEphemeris,
    earth: BodyEphemeris,
    vis: Visibility,
    events: list[ephemeris_pb2.Event] | None = None,
) -> analysis_pb2.Metrics:
    """Métricas del rango. Con `events` (de `metrics.events.detect`) se calcula también
    `first_sunrise_after_landing`."""
    step_h = grid.step_minutes / 60.0
    dark_len, dark_start, dark_end = longest_run(vis.sun_visible, False)
    # Panel vertical con seguimiento azimutal: g = cos(el) (sección 9.8)
    irradiance = (
        solar_irradiance_w_m2(sun.dist_km) * vis.sun_fraction * np.cos(np.radians(sun.el_deg))
    )
    return analysis_pb2.Metrics(
        illumination_pct=_pct(vis.sun_visible),
        illumination_pct_weighted=float(100.0 * np.mean(vis.sun_fraction)),
        longest_dark_h=dark_len * step_h,
        longest_dark_interval=_interval(grid, dark_start, dark_end) if dark_len else None,
        dark_periods_count=run_count(vis.sun_visible, False),
        earth_visible_pct=_pct(vis.earth_visible),
        earth_visible_h=float(np.count_nonzero(vis.earth_visible) * step_h),
        longest_comm_window_h=longest_run(vis.earth_visible, True)[0] * step_h,
        longest_comm_blackout_h=longest_run(vis.earth_visible, False)[0] * step_h,
        operable_pct=_pct(vis.operable),
        longest_operable_window_h=longest_run(vis.operable, True)[0] * step_h,
        sun_elev_mean_visible_deg=(
            float(np.mean(sun.el_deg[vis.sun_visible])) if vis.sun_visible.any() else None
        ),
        sun_elev_max_deg=float(np.max(sun.el_deg)),
        sun_elev_min_deg=float(np.min(sun.el_deg)),
        earth_elev_mean_deg=float(np.mean(earth.el_deg)),
        earth_elev_max_deg=float(np.max(earth.el_deg)),
        earth_elev_min_deg=float(np.min(earth.el_deg)),
        eclipse_hours=float(np.count_nonzero(vis.eclipse_fraction > 0) * step_h),
        first_sunrise_after_landing=_first_sunrise(vis, events),
        energy_kwh_per_m2=float(np.sum(irradiance) * step_h / 1000.0),
    )
