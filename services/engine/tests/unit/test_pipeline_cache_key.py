"""Llaves de caché del horizonte y del análisis (sección 11.1)."""

import pytest
from pyproj import CRS, Transformer

from lumen_engine.analysis.cache_key import analysis_cache_key, horizon_cache_key, polar_stereo_xy
from lumen_engine.core.constants import SOUTH_POLAR_STEREO_PROJ4
from lumen_engine.dem.index import LUNAR_GEOGRAPHIC

KW = {"obs_height_m": 2.0, "az_step_deg": 0.25, "max_range_km": 200.0, "dem_version": "v1"}


@pytest.mark.parametrize(("lat", "lon"), [(-89.45, -137.31), (-85.0, 10.0), (-80.5, 179.9)])
def test_closed_form_matches_proj_south_polar_stereographic(lat: float, lon: float) -> None:
    proj = Transformer.from_crs(
        LUNAR_GEOGRAPHIC, CRS.from_proj4(SOUTH_POLAR_STEREO_PROJ4), always_xy=True
    )
    assert polar_stereo_xy(lat, lon) == pytest.approx(proj.transform(lon, lat), abs=1e-3)


def test_closed_form_matches_proj_north_polar_stereographic() -> None:
    north = SOUTH_POLAR_STEREO_PROJ4.replace("+lat_0=-90", "+lat_0=90")
    proj = Transformer.from_crs(LUNAR_GEOGRAPHIC, CRS.from_proj4(north), always_xy=True)
    assert polar_stereo_xy(88.0, 45.0) == pytest.approx(proj.transform(45.0, 88.0), abs=1e-3)


def test_polar_points_within_a_few_meters_share_key_far_points_do_not() -> None:
    base = horizon_cache_key(-89.45, -137.31, **KW)  # type: ignore[arg-type]
    # 1e-5° de latitud ≈ 0.3 m; 1e-3° ≈ 30 m
    assert horizon_cache_key(-89.45001, -137.31, **KW) == base  # type: ignore[arg-type]
    assert horizon_cache_key(-89.451, -137.31, **KW) != base  # type: ignore[arg-type]


def test_longitude_conventions_share_key() -> None:
    a = horizon_cache_key(-89.45, -137.31, **KW)  # type: ignore[arg-type]
    assert horizon_cache_key(-89.45, 222.69, **KW) == a  # type: ignore[arg-type]
    b = horizon_cache_key(10.0, -20.0, **KW)  # type: ignore[arg-type]
    assert horizon_cache_key(10.0, 340.0, **KW) == b  # type: ignore[arg-type]


@pytest.mark.parametrize(
    "change",
    [{"obs_height_m": 3.0}, {"az_step_deg": 0.5}, {"max_range_km": 100.0}, {"dem_version": "v2"}],
)
def test_horizon_parameters_change_key(change: dict[str, object]) -> None:
    base = horizon_cache_key(-89.45, -137.31, **KW)  # type: ignore[arg-type]
    assert horizon_cache_key(-89.45, -137.31, **{**KW, **change}) != base  # type: ignore[arg-type]


def test_mid_latitudes_round_to_1e_4_degrees() -> None:
    a = horizon_cache_key(10.00001, 20.0, **KW)  # type: ignore[arg-type]
    assert horizon_cache_key(10.00002, 20.0, **KW) == a  # type: ignore[arg-type]
    assert horizon_cache_key(10.0002, 20.0, **KW) != a  # type: ignore[arg-type]


def test_analysis_key_depends_on_every_input() -> None:
    kw: dict[str, object] = {
        "start_iso": "2027-01-01T00:00:00+00:00",
        "end_iso": "2027-02-01T00:00:00+00:00",
        "step_minutes": 30,
        "sun_min_fraction": 0.5,
        "earth_margin_deg": 0.0,
        "engine_version": "0.1.0",
    }
    base = analysis_cache_key("h", **kw)  # type: ignore[arg-type]
    for name, value in [
        ("start_iso", "2027-01-02T00:00:00+00:00"),
        ("end_iso", "2027-03-01T00:00:00+00:00"),
        ("step_minutes", 60),
        ("sun_min_fraction", 0.0),
        ("earth_margin_deg", 1.0),
        ("engine_version", "0.2.0"),
    ]:
        assert analysis_cache_key("h", **{**kw, name: value}) != base  # type: ignore[arg-type]
    assert analysis_cache_key("h2", **kw) != base  # type: ignore[arg-type]
