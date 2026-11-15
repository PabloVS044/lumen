#!/usr/bin/env python3
"""Precalcula máscaras del catálogo para el warmup de R2 (archivos locales, sin caché R1)."""

import argparse
import json
import re
from pathlib import Path

import yaml
from google.protobuf.json_format import MessageToDict
from lumen.v1 import common_pb2
from lumen_engine.core.errors import EngineError
from lumen_engine.dem.coverage import coverage
from lumen_engine.dem.index import layers
from lumen_engine.horizon.mask import compute

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG = ROOT / "data" / "catalog" / "sites.yaml"
DEFAULT_OUTPUT = ROOT / "data" / "local" / "horizons"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--site-id", action="append", default=[])
    parser.add_argument("--az-step-deg", type=float, default=0.25)
    parser.add_argument("--max-range-km", type=float, default=200)
    args = parser.parse_args()
    if args.az_step_deg <= 0 or args.max_range_km <= 0:
        parser.error("az-step-deg and max-range-km must be positive")
    catalog = yaml.safe_load(args.catalog.read_text(encoding="utf-8"))
    if not isinstance(catalog, list):
        parser.error("catalog must be a YAML list")
    selected = set(args.site_id)
    known = {str(item["id"]) for item in catalog}
    if selected - known:
        parser.error(f"unknown site ID(s): {', '.join(sorted(selected - known))}")
    output: Path = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    sources = {layer.id: layer.source_url for layer in layers()}
    done = skipped = 0
    for item in catalog:
        site_id = str(item["id"])
        if selected and site_id not in selected:
            continue
        if re.fullmatch(r"[A-Za-z0-9_-]+", site_id) is None:
            raise ValueError(f"Invalid catalog site ID: {site_id}")
        site = common_pb2.Site(lat=float(item["lat"]), lon=float(item["lon"]))
        try:
            cov = coverage(site.lat, site.lon)
            mask = compute(
                site, az_step_deg=args.az_step_deg, max_range_km=args.max_range_km
            )
        except EngineError as exc:
            print(f"skip {site_id}: {exc.code} ({exc})", flush=True)
            skipped += 1
            continue
        payload = {
            "site_id": site_id,
            "name": item.get("name"),
            "verified": bool(item.get("verified", False)),
            "coord_precision": item.get("coord_precision"),
            "coverage": MessageToDict(cov),
            "horizon": MessageToDict(mask),
            "dem_sources": {
                layer_id: sources[layer_id] for layer_id in mask.layers_used
            },
            "method": "raycast with spherical curvature; see docs/methodology.md",
        }
        destination = output / f"{site_id}.json"
        temp = output / f"{site_id}.json.part"
        temp.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        temp.replace(destination)
        print(f"ok {site_id}: {len(mask.elevation_deg)} azimuths", flush=True)
        done += 1
    print(f"done={done} skipped={skipped} output={output}")


if __name__ == "__main__":
    main()
