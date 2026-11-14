#!/usr/bin/env python3
"""Precalcula una capa regional COG de iluminación/visibilidad (M16 experimental, R2).

La grilla se basa en la búsqueda M12: celdas sin evaluación directa toman el valor
del candidato evaluado más cercano. Guardar el COG y sus metadatos fuera del repo.
"""

import argparse
import json
import math
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rasterio
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2, search_pb2
from lumen_engine.dem.coverage import sample_height
from lumen_engine.dem.index import LUNAR_GEOGRAPHIC, metric_crs, require_coverage
from lumen_engine.ephem.spice import series
from lumen_engine.search.best_spot import run
from pyproj import Transformer
from rasterio.shutil import copy as raster_copy
from rasterio.transform import from_origin


def _timestamp(value: str) -> Timestamp:
    moment = datetime.fromisoformat(value)
    if moment.tzinfo is None:
        raise ValueError("Time must include a UTC offset")
    moment = moment.astimezone(UTC)
    result = Timestamp()
    result.FromDatetime(moment)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lat", type=float, default=-89.45)
    parser.add_argument("--lon", type=float, default=-137.31)
    parser.add_argument("--radius-km", type=float, default=2)
    parser.add_argument("--spacing-m", type=float, default=500)
    parser.add_argument("--max-slope-deg", type=float, default=15)
    parser.add_argument("--start", default="2027-01-01T00:00:00Z")
    parser.add_argument("--end", default="2027-02-01T00:00:00Z")
    parser.add_argument("--step-minutes", type=int, default=60)
    parser.add_argument(
        "--objective",
        choices=("illumination_pct", "earth_visible_pct"),
        default="illumination_pct",
    )
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if not 0.5 <= args.radius_km <= 20 or not 50 <= args.spacing_m <= 2000:
        parser.error("radius-km must be 0.5–20 and spacing-m 50–2000")
    point = common_pb2.LatLon(lat=args.lat, lon=args.lon)
    interval = common_pb2.TimeRange(
        start=_timestamp(args.start),
        end=_timestamp(args.end),
        step_minutes=args.step_minutes,
    )
    req = search_pb2.FindBestSpotRequest(
        center=point,
        radius_km=args.radius_km,
        spacing_m=args.spacing_m,
        max_slope_deg=args.max_slope_deg,
        range=interval,
        objective=args.objective,
        top_k=10,
    )
    height, _ = sample_height(args.lat, args.lon)
    eph = series(
        common_pb2.Site(lat=args.lat, lon=args.lon), interval, terrain_height_m=height
    )
    last_stage = ""

    def progress(fraction: float, stage: str) -> None:
        nonlocal last_stage
        if stage != last_stage:
            print(f"{fraction:.0%} {stage}", flush=True)
            last_stage = stage

    result = run(req, eph, progress)
    layer = require_coverage(args.lat, args.lon)[0]
    with layer.open() as ds:
        crs = metric_crs(ds.crs, args.lat, args.lon)
        forward = Transformer.from_crs(LUNAR_GEOGRAPHIC, crs, always_xy=True)
        cx, cy = forward.transform(args.lon, args.lat)
    n = math.ceil(args.radius_km * 1000 / args.spacing_m)
    transform = from_origin(
        cx - n * args.spacing_m - args.spacing_m / 2,
        cy + n * args.spacing_m + args.spacing_m / 2,
        args.spacing_m,
        args.spacing_m,
    )
    values = np.flipud(
        np.asarray(result.grid_values, dtype=np.float32).reshape(
            result.grid_rows, result.grid_cols
        )
    )
    output: Path = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.with_name(output.stem + ".tmp.tif")
    with rasterio.open(
        tmp,
        "w",
        driver="GTiff",
        width=result.grid_cols,
        height=result.grid_rows,
        count=1,
        dtype="float32",
        crs=crs,
        transform=transform,
        nodata=np.nan,
    ) as ds:
        ds.write(values, 1)
    try:
        raster_copy(tmp, output, driver="COG", compress="DEFLATE", blocksize=512)
    finally:
        tmp.unlink(missing_ok=True)
    metadata = {
        "objective": args.objective,
        "center": [args.lat, args.lon],
        "radius_km": args.radius_km,
        "spacing_m": args.spacing_m,
        "start_utc": args.start,
        "end_utc": args.end,
        "method": "hierarchical horizon search; unsampled cells use nearest evaluated value",
        "source_url": layer.source_url,
        "vertical_datum": layer.vertical_datum,
    }
    output.with_suffix(".json").write_text(
        json.dumps(metadata, indent=2) + "\n", encoding="utf-8"
    )
    print(output)


if __name__ == "__main__":
    main()
