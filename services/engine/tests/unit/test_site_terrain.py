import pytest

from lumen_engine.core.errors import NoCoverageError
from lumen_engine.ephem import terrain


def test_uses_dem_height_when_available(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(terrain, "sample_height", lambda lat, lon: (1820.5, object()))
    assert terrain.site_terrain_height_m(-89.45, -137.31) == 1820.5


def test_falls_back_to_reference_sphere_without_coverage(monkeypatch: pytest.MonkeyPatch) -> None:
    def no_dem(lat: float, lon: float) -> tuple[float, object]:
        raise NoCoverageError(lat, lon)

    monkeypatch.setattr(terrain, "sample_height", no_dem)
    assert terrain.site_terrain_height_m(0.0, 0.0) == 0.0


def test_normalizes_longitude_before_sampling(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[float] = []

    def spy(lat: float, lon: float) -> tuple[float, object]:
        seen.append(lon)
        return 0.0, object()

    monkeypatch.setattr(terrain, "sample_height", spy)
    terrain.site_terrain_height_m(-89.0, 222.69)
    assert seen == [pytest.approx(-137.31)]
