import pytest

from lumen_engine.metrics.upcoming import _step_minutes


@pytest.mark.parametrize(("days", "step"), [(1, 10), (60, 10), (730, 22)])
def test_step_keeps_samples_bounded(days: int, step: int) -> None:
    assert _step_minutes(days) == step
