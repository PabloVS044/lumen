"""Score compuesto para comparar escenarios (sección 9.7). Owner: R3 Efemérides/Ciencia.

score = Σ wᵢ · norm(métricaᵢ) / Σ wᵢ, con norm = min-max entre los escenarios comparados (invertido
cuando menor es mejor). La UI muestra siempre las métricas crudas además del score.
"""

from collections.abc import Mapping, Sequence

import numpy as np
from lumen.v1 import analysis_pb2

from lumen_engine.core.errors import EngineError
from lumen_engine.visibility.disk import FloatArray

DEFAULT_WEIGHTS: dict[str, float] = {
    "illumination_pct": 1.0,
    "longest_dark_h": 1.0,
    "earth_visible_pct": 1.0,
    "longest_comm_window_h": 1.0,
    "operable_pct": 1.0,
}
HIGHER_IS_BETTER: dict[str, bool] = {
    "illumination_pct": True,
    "illumination_pct_weighted": True,
    "longest_dark_h": False,
    "earth_visible_pct": True,
    "earth_visible_h": True,
    "longest_comm_window_h": True,
    "longest_comm_blackout_h": False,
    "operable_pct": True,
    "longest_operable_window_h": True,
    "energy_kwh_per_m2": True,
}


def _validate(weights: Mapping[str, float]) -> None:
    unknown = sorted(set(weights) - set(HIGHER_IS_BETTER))
    if unknown:
        raise EngineError(
            "UNKNOWN_METRIC", "Unknown metric in weights.", {"metrics": ",".join(unknown)}
        )
    if any(w < 0 for w in weights.values()) or sum(weights.values()) <= 0:
        raise EngineError("INVALID_WEIGHTS", "Weights must be >= 0 and not all zero.")


def _normalized(values: Sequence[float], higher_is_better: bool) -> FloatArray:
    v = np.asarray(values, dtype=np.float64)
    lo, hi = float(v.min()), float(v.max())
    if hi == lo:
        return np.ones_like(v)
    n = (v - lo) / (hi - lo)
    return n if higher_is_better else 1.0 - n


def score(
    metrics: Sequence[analysis_pb2.Metrics], weights: Mapping[str, float] | None = None
) -> list[float]:
    """Score en [0, 1] por escenario (1 = mejor en todas las métricas ponderadas)."""
    w = dict(weights) if weights else DEFAULT_WEIGHTS
    _validate(w)
    total = sum(w.values())
    acc = np.zeros(len(metrics))
    for name, weight in w.items():
        values = [float(getattr(m, name)) for m in metrics]
        acc += weight * _normalized(values, HIGHER_IS_BETTER[name])
    return [float(x) for x in acc / total]


def best_by_metric(metrics: Sequence[analysis_pb2.Metrics]) -> dict[str, int]:
    """Índice del escenario con mejor valor por métrica (`CompareResponse.best_by_metric`)."""
    out = {}
    for name, higher in HIGHER_IS_BETTER.items():
        values = np.array([float(getattr(m, name)) for m in metrics])
        out[name] = int(np.argmax(values) if higher else np.argmin(values))
    return out
