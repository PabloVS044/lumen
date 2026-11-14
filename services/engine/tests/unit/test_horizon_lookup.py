import numpy as np
import pytest
from hypothesis import given
from hypothesis import strategies as st

from lumen_engine.visibility.horizon_lookup import horizon_at

MASK = np.array([0.0, 1.0, 2.0, 3.0])  # az 0, 90, 180, 270 (paso 90°)


@pytest.mark.parametrize(
    ("az", "expected"),
    [(0.0, 0.0), (45.0, 0.5), (90.0, 1.0), (270.0, 3.0), (315.0, 1.5), (359.0, 3.0 * 1 / 90)],
)
def test_linear_interpolation_with_wraparound(az: float, expected: float) -> None:
    assert horizon_at(np.array([az]), MASK, 90.0)[0] == pytest.approx(expected)


def test_negative_and_over_360_azimuths_wrap() -> None:
    assert horizon_at(np.array([-45.0, 405.0]), MASK, 90.0) == pytest.approx([1.5, 0.5])


@given(st.floats(min_value=0, max_value=360, exclude_max=True, allow_nan=False))
def test_constant_mask_gives_constant_horizon(az: float) -> None:
    assert horizon_at(np.array([az]), np.full(1440, -0.3), 0.25)[0] == pytest.approx(-0.3)


def test_mask_size_must_match_step() -> None:
    with pytest.raises(ValueError, match="360"):
        horizon_at(np.array([0.0]), np.zeros(10), 0.25)
