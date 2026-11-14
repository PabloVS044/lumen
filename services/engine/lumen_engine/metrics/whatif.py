"""What-if de retraso: métricas en función del retraso del aterrizaje (sección 9.9, HU-08).
Owner: R3 Efemérides/Ciencia.

Las series se calculan una sola vez para [nominal, nominal + retraso máx. + duración] y cada retraso
es una ventana deslizante sobre ellas; las métricas se recalculan completas por ventana (con las
duraciones de la sección 9.9, unas decenas de ventanas cuestan milisegundos).

Retrasos recomendados: los de score (sección 9.7, pesos iguales sobre las métricas pedidas) a menos
de `RECOMMEND_WITHIN` del mejor, excluyendo los que no sobreviven si se simula batería.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import analysis_pb2, common_pb2, whatif_pb2

from lumen_engine.core.errors import EngineError
from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.metrics.compute import compute as compute_metrics
from lumen_engine.metrics.score import HIGHER_IS_BETTER, score
from lumen_engine.power.simulator import PowerParams, simulate
from lumen_engine.visibility.compute import Visibility
from lumen_engine.visibility.site import site_visibility

DEFAULT_METRICS = ("illumination_pct", "longest_dark_h", "operable_pct")
DEFAULT_DELAY_STEP_H = 24
RECOMMEND_WITHIN = 0.1
# 30 min divide cualquier paso de retraso en horas enteras; con el límite de 730 días son
# como máximo ~35 000 muestras, dentro de MAX_SAMPLES.
SERIES_STEP_MINUTES = 30


@dataclass(frozen=True)
class WhatIfPoint:
    delay_hours: float
    landing: datetime
    metrics: dict[str, float]
    survives: bool | None


@dataclass(frozen=True)
class WhatIfResult:
    points: list[WhatIfPoint]
    recommended_delays_hours: list[float]


def _validate_metrics(names: list[str]) -> None:
    unknown = sorted(set(names) - set(HIGHER_IS_BETTER))
    if unknown:
        raise EngineError(
            "UNKNOWN_METRIC", "Unknown metric for what-if.", {"metrics": ",".join(unknown)}
        )


def evaluate(
    grid: TimeGrid,
    sun: BodyEphemeris,
    earth: BodyEphemeris,
    vis: Visibility,
    *,
    delay_step_h: int,
    max_delay_h: int,
    duration_h: float,
    metric_names: list[str],
    power: PowerParams | None,
) -> WhatIfResult:
    """Evalúa cada retraso k·delay_step_h ≤ max_delay_h cuya ventana cabe en las series."""
    _validate_metrics(metric_names)
    step_min = grid.step_minutes
    stride = delay_step_h * 60 // step_min
    window = round(duration_h * 60 / step_min) + 1
    times = grid.datetimes()

    points: list[WhatIfPoint] = []
    all_metrics: list[analysis_pb2.Metrics] = []
    for k in range(max_delay_h // delay_step_h + 1):
        a, b = k * stride, k * stride + window
        if b > len(grid):
            break
        sub_sun, sub_vis = sun.window(a, b), vis.window(a, b)
        m = compute_metrics(grid.window(a, b), sub_sun, earth.window(a, b), sub_vis)
        survives = None
        if power is not None:
            survives = simulate(grid.window(a, b), sub_sun, sub_vis.sun_fraction, power).survives
        all_metrics.append(m)
        points.append(
            WhatIfPoint(
                delay_hours=float(k * delay_step_h),
                landing=times[a],
                metrics={name: float(getattr(m, name)) for name in metric_names},
                survives=survives,
            )
        )

    scores = score(all_metrics, weights=dict.fromkeys(metric_names, 1.0)) if points else []
    best = max(scores, default=0.0)
    recommended = [
        p.delay_hours
        for p, s in zip(points, scores, strict=True)
        if s >= best - RECOMMEND_WITHIN and p.survives is not False
    ]
    return WhatIfResult(points=points, recommended_delays_hours=recommended)


def evaluate_request(req: whatif_pb2.EvaluateRequest) -> WhatIfResult:
    """What-if para un sitio real (requiere la máscara de horizonte de R2)."""
    names = list(req.metrics) or list(DEFAULT_METRICS)
    _validate_metrics(names)
    power = PowerParams.from_proto(req.power) if req.HasField("power") else None
    delay_step_h = req.delay_step_hours or DEFAULT_DELAY_STEP_H
    max_delay_h = req.max_delay_days * 24
    duration_h = req.mission_duration_days * 24

    start = req.nominal_landing.ToDatetime().replace(tzinfo=None)
    s, e = Timestamp(), Timestamp()
    s.FromDatetime(start)
    e.FromDatetime(start + timedelta(hours=max_delay_h + duration_h))
    rng = common_pb2.TimeRange(start=s, end=e, step_minutes=SERIES_STEP_MINUTES)
    sv = site_visibility(req.site, rng)
    eph = sv.ephemeris
    return evaluate(
        eph.grid,
        eph.sun,
        eph.earth,
        sv.visibility,
        delay_step_h=delay_step_h,
        max_delay_h=max_delay_h,
        duration_h=duration_h,
        metric_names=names,
        power=power,
    )
