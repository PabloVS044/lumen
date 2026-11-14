import numpy as np
import pytest

from lumen_engine.visibility.disk import disk_fraction


@pytest.mark.parametrize(("s", "expected"), [(1.0, 1.0), (-1.0, 0.0), (0.0, 0.5), (5.0, 1.0)])
def test_disk_fraction_reference_points(s: float, expected: float) -> None:
    r = np.array([0.27])
    assert disk_fraction(np.array([s * 0.27]), np.array([0.0]), r)[0] == pytest.approx(expected)
