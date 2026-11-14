import numpy as np

from lumen_engine.metrics.streaks import longest_run


def test_longest_dark_run() -> None:
    s = np.array([1, 0, 0, 1, 0, 0, 0, 1], dtype=bool)
    assert longest_run(s, False) == (3, 4, 7)


def test_no_run() -> None:
    assert longest_run(np.ones(4, dtype=bool), False) == (0, 0, 0)
