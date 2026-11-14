import pytest

from lumen_engine.core.defaults import normalize_lon


@pytest.mark.parametrize(("lon", "expected"), [(222.69, -137.31), (180.0, -180.0), (-10.0, -10.0)])
def test_normalize_lon(lon: float, expected: float) -> None:
    assert normalize_lon(lon) == pytest.approx(expected)
