import pytest
from lumen.v1 import analysis_pb2

from lumen_engine.core.errors import EngineError
from lumen_engine.metrics.score import best_by_metric, score


def _m(
    illum: float, dark: float, earth: float = 50, comm: float = 10, op: float = 30
) -> analysis_pb2.Metrics:
    return analysis_pb2.Metrics(
        illumination_pct=illum,
        longest_dark_h=dark,
        earth_visible_pct=earth,
        longest_comm_window_h=comm,
        operable_pct=op,
    )


def test_default_weights_rank_better_site_first() -> None:
    good, bad = _m(90, 10, 80, 100, 70), _m(40, 200, 20, 5, 10)
    s = score([good, bad])
    assert s == pytest.approx([1.0, 0.0])


def test_lower_is_better_for_dark_period() -> None:
    s = score([_m(50, 10), _m(50, 100)], weights={"longest_dark_h": 1.0})
    assert s == pytest.approx([1.0, 0.0])


def test_ties_do_not_penalize() -> None:
    assert score([_m(50, 10), _m(50, 10)]) == pytest.approx([1.0, 1.0])


def test_custom_weights_mix_metrics() -> None:
    a, b = _m(100, 100), _m(0, 0)
    s = score([a, b], weights={"illumination_pct": 3.0, "longest_dark_h": 1.0})
    assert s == pytest.approx([0.75, 0.25])


@pytest.mark.parametrize(
    "weights", [{"nope": 1.0}, {"illumination_pct": -1.0}, {"illumination_pct": 0.0}]
)
def test_invalid_weights_are_rejected(weights: dict[str, float]) -> None:
    with pytest.raises(EngineError):
        score([_m(1, 1), _m(2, 2)], weights=weights)


def test_best_by_metric() -> None:
    best = best_by_metric([_m(40, 50), _m(90, 80), _m(60, 20)])
    assert best["illumination_pct"] == 1
    assert best["longest_dark_h"] == 2
