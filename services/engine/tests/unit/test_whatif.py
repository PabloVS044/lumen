import numpy as np
import pytest
from lumen.v1 import power_pb2

from lumen_engine.core.constants import AU_KM
from lumen_engine.core.errors import EngineError
from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.metrics.whatif import evaluate
from lumen_engine.power.simulator import PowerParams
from lumen_engine.visibility.compute import Visibility

N = 24 * 6 + 1  # 6 días a paso de 1 h


def _grid() -> TimeGrid:
    utc = np.datetime64("2027-01-01T00:00:00", "s") + np.arange(N) * np.timedelta64(3600, "s")
    return TimeGrid(utc=utc, et=np.arange(N, dtype=np.float64) * 3600.0, step_minutes=60)


def _inputs() -> tuple[TimeGrid, BodyEphemeris, BodyEphemeris, Visibility]:
    # Noche las primeras 48 h, luego día: retrasar el aterrizaje mejora la iluminación
    sun_on = np.arange(N) >= 48
    frac = sun_on.astype(np.float64)
    sun = BodyEphemeris(np.zeros(N), np.where(sun_on, 1.0, -1.0), np.full(N, AU_KM))
    earth = BodyEphemeris(np.zeros(N), np.full(N, 5.0), np.full(N, 384_400.0))
    ones = np.ones(N, dtype=bool)
    vis = Visibility(
        horizon_at_sun=np.zeros(N),
        horizon_at_earth=np.zeros(N),
        sun_fraction=frac,
        earth_fraction=np.ones(N),
        eclipse_fraction=np.zeros(N),
        sun_visible=sun_on,
        earth_visible=ones,
        operable=sun_on,
    )
    return _grid(), sun, earth, vis


def test_metrics_per_delay_use_the_sliding_window() -> None:
    grid, sun, earth, vis = _inputs()
    res = evaluate(
        grid,
        sun,
        earth,
        vis,
        delay_step_h=24,
        max_delay_h=72,
        duration_h=48,
        metric_names=["illumination_pct", "longest_dark_h"],
        power=None,
    )
    assert [p.delay_hours for p in res.points] == [0, 24, 48, 72]
    illum = [p.metrics["illumination_pct"] for p in res.points]
    # Ventana de 49 muestras: con retraso 0 hay 1 muestra de luz (t=48h); con 24 h, 25; luego 49
    assert illum == pytest.approx([100 / 49, 100 * 25 / 49, 100.0, 100.0])
    assert [p.metrics["longest_dark_h"] for p in res.points] == pytest.approx([48, 24, 0, 0])
    assert res.points[1].landing.isoformat() == "2027-01-02T00:00:00+00:00"
    assert all(p.survives is None for p in res.points)


def test_recommended_delays_are_the_best_scoring_ones() -> None:
    grid, sun, earth, vis = _inputs()
    res = evaluate(
        grid,
        sun,
        earth,
        vis,
        delay_step_h=24,
        max_delay_h=72,
        duration_h=48,
        metric_names=["illumination_pct"],
        power=None,
    )
    assert res.recommended_delays_hours == [48, 72]


def test_delays_that_do_not_fit_the_series_are_dropped() -> None:
    grid, sun, earth, vis = _inputs()
    res = evaluate(
        grid,
        sun,
        earth,
        vis,
        delay_step_h=24,
        max_delay_h=24 * 10,
        duration_h=48,
        metric_names=["illumination_pct"],
        power=None,
    )
    assert res.points[-1].delay_hours == 96  # 96 + 48 = 144 h = fin de la serie


def test_power_marks_delays_that_brown_out() -> None:
    grid, sun, earth, vis = _inputs()
    cfg = power_pb2.PowerConfig(battery_wh=500.0, load_night_w=60.0)
    res = evaluate(
        grid,
        sun,
        earth,
        vis,
        delay_step_h=24,
        max_delay_h=72,
        duration_h=48,
        metric_names=["illumination_pct"],
        power=PowerParams.from_proto(cfg),
    )
    # 500 Wh con 80 % DoD = 400 Wh útiles: 48 h de noche a 60 W no se aguantan
    assert [p.survives for p in res.points] == [False, False, True, True]
    assert res.recommended_delays_hours == [48, 72]


def test_unknown_metric_is_rejected() -> None:
    grid, sun, earth, vis = _inputs()
    with pytest.raises(EngineError) as exc:
        evaluate(
            grid,
            sun,
            earth,
            vis,
            delay_step_h=24,
            max_delay_h=24,
            duration_h=24,
            metric_names=["first_sunrise_after_landing"],
            power=None,
        )
    assert exc.value.code == "UNKNOWN_METRIC"
