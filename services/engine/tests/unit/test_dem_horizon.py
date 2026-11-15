"""DEM y horizonte contra terreno sintético. Secciones 9.3 y 14.2 (R2)."""

import json
import shutil
from collections.abc import Iterator
from pathlib import Path

import numpy as np
import pytest
import rasterio
from lumen.v1 import common_pb2, search_pb2
from pyproj import CRS, Transformer
from rasterio.transform import from_origin

from lumen_engine.core.constants import MOON_RADIUS_M, SOUTH_POLAR_STEREO_PROJ4
from lumen_engine.dem import index
from lumen_engine.dem.coverage import coverage, terrain_point
from lumen_engine.dem.raster import read_disk, read_points
from lumen_engine.horizon import mask
from lumen_engine.horizon.geometry import destination, terrain_elevation_angle
from lumen_engine.horizon.mask import compute
from lumen_engine.horizon.uncertainty import clone_envelope
from lumen_engine.search import best_spot

LAT, LON = -89.45, -137.31


@pytest.fixture
def flat_dem(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    crs = CRS.from_proj4(SOUTH_POLAR_STEREO_PROJ4)
    project = Transformer.from_crs(index.LUNAR_GEOGRAPHIC, crs, always_xy=True)
    x, y = project.transform(LON, LAT)
    transform = from_origin(x - 5000, y + 5000, 20, 20)
    profile = {
        "driver": "GTiff",
        "height": 500,
        "width": 500,
        "count": 1,
        "dtype": "float32",
        "crs": crs,
        "transform": transform,
        "nodata": np.nan,
    }
    with rasterio.open(tmp_path / "height.tif", "w", **profile) as ds:
        ds.write(np.zeros((500, 500), dtype=np.float32), 1)
    with rasterio.open(tmp_path / "counts.tif", "w", **profile) as ds:
        ds.write(np.ones((500, 500), dtype=np.float32), 1)
    with rasterio.open(tmp_path / "slope.tif", "w", **profile) as ds:
        ds.write(np.zeros((500, 500), dtype=np.float32), 1)
    manifest = {
        "schema_version": 1,
        "layers": [
            {
                "id": "synthetic",
                "file": "height.tif",
                "resolution_m": 20,
                "source_url": "synthetic",
                "ldec_file": "counts.tif",
                "slope_file": "slope.tif",
            }
        ],
    }
    (tmp_path / "index.json").write_text(json.dumps(manifest), encoding="utf-8")

    def layer_list() -> tuple[index.Layer, ...]:
        return index.load_index(str(tmp_path / "index.json"), str(tmp_path))

    monkeypatch.setattr(index, "layers", layer_list)
    monkeypatch.setattr(mask, "layers", layer_list)
    yield tmp_path
    index.load_index.cache_clear()


def test_coverage_and_point(flat_dem: Path) -> None:
    cov = coverage(LAT, LON)
    assert cov.layers == ["synthetic"]
    assert cov.near_res_m == 20
    assert cov.interpolated_fraction == 0
    assert terrain_point(LAT, LON) == pytest.approx((0, 0))


def test_nodata_falls_back_to_coarser_dem(flat_dem: Path) -> None:
    with rasterio.open(flat_dem / "height.tif", "r+") as ds:
        x, y = index.project(ds, LON, LAT)
        row, col = ds.index(x, y)
        ds.write(
            np.full((4, 4), np.nan, dtype=np.float32),
            1,
            window=rasterio.windows.Window(col - 2, row - 2, 4, 4),
        )
        coarse_profile = ds.profile.copy()
        coarse_profile.update(
            width=250,
            height=250,
            transform=from_origin(x - 5000, y + 5000, 40, 40),
        )
    with rasterio.open(flat_dem / "coarse.tif", "w", **coarse_profile) as ds:
        ds.write(np.zeros((250, 250), dtype=np.float32), 1)
    manifest_path = flat_dem / "index.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["layers"].append(
        {"id": "coarse", "file": "coarse.tif", "resolution_m": 40, "source_url": "synthetic"}
    )
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
    index.load_index.cache_clear()
    cov = coverage(LAT, LON)
    assert cov.layers == ["synthetic", "coarse"]
    assert cov.near_res_m == 40
    assert any("NoData" in warning for warning in cov.warnings)
    assert terrain_point(LAT, LON)[0] == pytest.approx(0)


def test_global_dem_scale_and_antimeridian(tmp_path: Path) -> None:
    path = tmp_path / "global.tif"
    profile = {
        "driver": "GTiff",
        "width": 360,
        "height": 180,
        "count": 1,
        "dtype": "int16",
        "crs": index.LUNAR_GEOGRAPHIC,
        "transform": from_origin(-180, 90, 1, 1),
    }
    data = np.full((180, 360), 100, dtype=np.int16)
    data[:, 0] = 200
    with rasterio.open(path, "w", **profile) as ds:
        ds.write(data, 1)
    layer = index.Layer("global", str(path), 236.9, "synthetic", height_scale=0.5)
    values = read_points(layer, np.array([179.5, -179.5]), np.array([0.5, 0.5]))
    assert values == pytest.approx([50, 100])
    disk = read_disk(layer, 0.5, 179.5, 300_000)
    assert disk.sample(np.array([-179.5]), np.array([0.5])) == pytest.approx([100])
    assert disk.data.shape[1] < 360


def test_flat_sphere_horizon_matches_dip(flat_dem: Path) -> None:
    result = compute(common_pb2.Site(lat=LAT, lon=LON), az_step_deg=45, max_range_km=4)
    dip = -np.degrees(np.arccos(MOON_RADIUS_M / (MOON_RADIUS_M + 2)))
    assert result.elevation_deg == pytest.approx([dip] * 8, abs=1e-4)
    assert result.layers_used == ["synthetic"]
    assert all(2500 < d < 2800 for d in result.obstacle_distance_m)


def test_known_mountain_dominates_east_ray(flat_dem: Path) -> None:
    target_lat, target_lon = destination(LAT, LON, 90, 2000)
    with rasterio.open(flat_dem / "height.tif", "r+") as ds:
        x, y = index.project(ds, target_lon, target_lat)
        row, col = ds.index(x, y)
        block = np.full((5, 5), 100, dtype=np.float32)
        ds.write(block, 1, window=rasterio.windows.Window(col - 2, row - 2, 5, 5))
    result = compute(common_pb2.Site(lat=LAT, lon=LON), az_step_deg=90, max_range_km=4)
    expected = terrain_elevation_angle(MOON_RADIUS_M + 2, 100, 2000)
    assert result.elevation_deg[1] == pytest.approx(expected, abs=0.2)
    assert result.obstacle_distance_m[1] == pytest.approx(2000, abs=100)
    assert result.elevation_deg[0] < 0


def test_clone_envelope_bounds_mountain_uncertainty(flat_dem: Path) -> None:
    from lumen_engine.ephem.spice import BodyEphemeris, EphemerisSeries
    from lumen_engine.ephem.timegrid import TimeGrid

    clone = flat_dem / "clone.tif"
    shutil.copyfile(flat_dem / "height.tif", clone)
    target_lat, target_lon = destination(LAT, LON, 90, 2000)
    with rasterio.open(clone, "r+") as ds:
        x, y = index.project(ds, target_lon, target_lat)
        row, col = ds.index(x, y)
        ds.write(
            np.full((5, 5), 100, dtype=np.float32),
            1,
            window=rasterio.windows.Window(col - 2, row - 2, 5, 5),
        )
    grid = TimeGrid(
        utc=np.array(["2027-01-01T00:00:00", "2027-01-01T01:00:00"], dtype="datetime64[s]"),
        et=np.zeros(2),
        step_minutes=60,
    )
    eph = EphemerisSeries(
        grid,
        BodyEphemeris(np.full(2, 90.0), np.full(2, 1.0), np.full(2, 149_600_000.0)),
        BodyEphemeris(np.zeros(2), np.full(2, 10.0), np.full(2, 384_400.0)),
    )
    envelope = clone_envelope(
        common_pb2.Site(lat=LAT, lon=LON),
        [flat_dem / "height.tif", clone],
        az_step_deg=90,
        max_range_km=4,
        ephemeris=eph,
    )
    assert envelope.clone_count == 2
    assert envelope.p05_deg[1] < envelope.p50_deg[1] < envelope.p95_deg[1]
    assert envelope.p05_deg[0] == pytest.approx(envelope.p95_deg[0])
    assert envelope.metrics["illumination_pct"].p05 < envelope.metrics["illumination_pct"].p95
    assert envelope.metrics["earth_visible_pct"].p05 == pytest.approx(100)


def test_small_search_grid_returns_ranked_candidates(
    flat_dem: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from lumen_engine.ephem.spice import BodyEphemeris, EphemerisSeries
    from lumen_engine.ephem.timegrid import TimeGrid

    def fake_horizon(
        site: common_pb2.Site,
        *,
        az_step_deg: float,
        max_range_km: float,
        near_limit_m: float = 10_000.0,
        terrain_height_m: float | None = None,
        preloaded_windows: object = None,
    ) -> object:
        from lumen.v1.horizon_pb2 import HorizonMask

        return HorizonMask(az_step_deg=az_step_deg, elevation_deg=[0.0] * round(360 / az_step_deg))

    monkeypatch.setattr(best_spot, "compute_horizon", fake_horizon)
    grid = TimeGrid(
        utc=np.array(["2027-01-01T00:00:00", "2027-01-01T01:00:00"], dtype="datetime64[s]"),
        et=np.zeros(2),
        step_minutes=60,
    )
    sun = BodyEphemeris(np.array([90.0, 90.0]), np.array([5.0, 5.0]), np.full(2, 149_600_000.0))
    earth = BodyEphemeris(np.array([0.0, 0.0]), np.array([10.0, 10.0]), np.full(2, 384_400.0))
    eph = EphemerisSeries(grid, sun, earth)
    req = search_pb2.FindBestSpotRequest(
        center=common_pb2.LatLon(lat=LAT, lon=LON),
        radius_km=0.5,
        spacing_m=500,
        max_slope_deg=10,
        objective="illumination_pct",
        top_k=2,
    )
    result = best_spot.run(req, eph)
    assert len(result.top) == 2
    assert len(result.grid_values) == result.grid_rows * result.grid_cols
    assert all(candidate.score == pytest.approx(100) for candidate in result.top)
    assert np.count_nonzero(np.isfinite(result.grid_values)) == 5


@pytest.mark.requires_kernels
def test_search_ephemeris_reprojection_matches_direct_spice() -> None:
    from datetime import UTC, datetime

    from google.protobuf.timestamp_pb2 import Timestamp

    from lumen_engine.ephem.geometry import site_position_km
    from lumen_engine.ephem.spice import body_azel, series

    start, end = Timestamp(), Timestamp()
    start.FromDatetime(datetime(2027, 1, 1, tzinfo=UTC))
    end.FromDatetime(datetime(2027, 1, 2, tzinfo=UTC))
    eph = series(common_pb2.Site(lat=LAT, lon=LON), common_pb2.TimeRange(start=start, end=end))
    near_lat, near_lon = destination(LAT, LON, 45, 10_000)
    center = site_position_km(LAT, LON, terrain_height_m=0, obs_height_m=2)
    for target, body in (("SUN", eph.sun), ("EARTH", eph.earth)):
        approximate = best_spot._reproject(
            best_spot._vectors(body, LAT, LON), center, near_lat, near_lon, 0
        )
        direct = body_azel(target, eph.grid.et, near_lat, near_lon, obs_height_m=2)
        assert np.max(np.abs(approximate.el_deg - direct.el_deg)) < 0.01
        delta_az = (approximate.az_deg - direct.az_deg + 180) % 360 - 180
        assert np.max(np.abs(delta_az * np.cos(np.radians(direct.el_deg)))) < 0.01
