#!/usr/bin/env python3
"""Descarga DEMs LOLA oficiales, convierte Site01 a COG y genera index.json (R2).

Ejecutar desde la raíz: services/engine/.venv/Scripts/python data/scripts/prepare_dem.py
Los GeoTIFF y el índice se guardan en data/local/dem (ignorado por git).
"""

import argparse
import json
import shutil
from pathlib import Path
from urllib.request import Request, urlopen

import rasterio
from rasterio.shutil import copy as raster_copy

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DIR = ROOT / "data" / "local" / "dem"
SITE_BASE = "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site01/"
POLAR_BASE = "https://pgda.gsfc.nasa.gov/data/LOLA_20mpp/"
GLOBAL_URL = "https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/JP2/LDEM_128.JP2"
SOURCES = {
    "Site01_final_adj_5mpp_surf.tif": SITE_BASE + "Site01_final_adj_5mpp_surf.tif",
    "Site01_final_adj_5mpp_ldec.tif": SITE_BASE + "Site01_final_adj_5mpp_ldec.tif",
    "Site01_final_adj_5mpp_slp.tif": SITE_BASE + "Site01_final_adj_5mpp_slp.tif",
    "LDEM_80S_80MPP_ADJ.TIF": POLAR_BASE + "LDEM_80S_80MPP_ADJ.TIF",
}
CLONE_URL = SITE_BASE + "Clones/Site01_final_adj_5mpp_{number:04d}_err.tif"


def download(dest: Path, url: str) -> None:
    head = Request(url, method="HEAD")
    with urlopen(head, timeout=30) as response:
        length = int(response.headers["Content-Length"])
    if dest.exists() and dest.stat().st_size == length:
        print(f"ok {dest.name} ({length} bytes)")
        return
    tmp = dest.with_name(dest.name + ".part")
    with urlopen(url, timeout=60) as response, tmp.open("wb") as output:
        shutil.copyfileobj(response, output)
    if tmp.stat().st_size != length:
        raise RuntimeError(f"Incomplete download: {dest.name}")
    tmp.replace(dest)
    print(f"downloaded {dest.name} ({length} bytes)")


def cog(source: Path, dest: Path) -> None:
    if dest.exists():
        with rasterio.open(dest) as ds:
            if ds.driver == "GTiff" and ds.width and ds.height:
                return
    tmp = dest.with_name(dest.name + ".part")
    raster_copy(
        source,
        tmp,
        driver="COG",
        compress="DEFLATE",
        predictor=3,
        blocksize=512,
        overview_resampling="AVERAGE",
    )
    tmp.replace(dest)
    print(f"COG {dest.name}")


def build_index(directory: Path, include_global: bool = False) -> None:
    items = [
        {
            "id": "PGDA_Site01_5m",
            "file": "Site01_5m_cog.tif",
            "resolution_m": 5,
            "ldec_file": "Site01_final_adj_5mpp_ldec.tif",
            "slope_file": "Site01_final_adj_5mpp_slp.tif",
            "source_url": SOURCES["Site01_final_adj_5mpp_surf.tif"],
        },
        {
            "id": "PGDA_80S_80m",
            "file": "LDEM_80S_80MPP_ADJ.TIF",
            "resolution_m": 80,
            "source_url": SOURCES["LDEM_80S_80MPP_ADJ.TIF"],
        },
    ]
    if include_global:
        items.append(
            {
                "id": "PDS_LOLA_global_128ppd",
                "file": "LDEM_128.JP2",
                "resolution_m": 236.9011752,
                "height_scale": 0.5,
                "source_url": GLOBAL_URL,
            }
        )
    for item in items:
        path = directory / str(item["file"])
        if not path.exists():
            raise FileNotFoundError(path)
        with rasterio.open(path) as ds:
            if ds.crs is None or ds.count != 1:
                raise ValueError(f"Invalid georeferenced DEM: {path}")
            resolution = (
                abs(ds.transform.a) * 3.141592653589793 / 180 * 1_737_400
                if item["id"] == "PDS_LOLA_global_128ppd"
                else abs(ds.transform.a)
            )
            if abs(resolution - float(item["resolution_m"])) > 0.01:
                raise ValueError(f"Unexpected resolution for {path}: {resolution}")
            bounds_key = "bounds_deg" if ds.crs.is_geographic else "bounds_m"
            item[bounds_key] = [
                ds.bounds.left,
                ds.bounds.bottom,
                ds.bounds.right,
                ds.bounds.top,
            ]
            item["vertical_datum"] = "LOLA sphere R=1737400 m"
        for companion in ("ldec_file", "slope_file"):
            if companion in item and not (directory / str(item[companion])).exists():
                raise FileNotFoundError(directory / str(item[companion]))
    data = {"schema_version": 1, "layers": items}
    tmp = directory / "index.json.part"
    tmp.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    tmp.replace(directory / "index.json")
    print(f"index {directory / 'index.json'}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, default=DEFAULT_DIR)
    parser.add_argument("--skip-download", action="store_true")
    parser.add_argument(
        "--global",
        dest="include_global",
        action="store_true",
        help="Incluir fallback global PDS LDEM_128.JP2 (~647 MB, 237 m/píxel)",
    )
    parser.add_argument(
        "--clones",
        type=int,
        default=0,
        help="Descargar los primeros N clones Site01 (0–100)",
    )
    args = parser.parse_args()
    if not 0 <= args.clones <= 100:
        parser.error("--clones must be between 0 and 100")
    directory: Path = args.directory.resolve()
    directory.mkdir(parents=True, exist_ok=True)
    if not args.skip_download:
        for name, url in SOURCES.items():
            download(directory / name, url)
        if args.include_global:
            download(directory / "LDEM_128.JP2", GLOBAL_URL)
        if args.clones:
            clone_dir = directory / "Clones"
            clone_dir.mkdir(exist_ok=True)
            for number in range(1, args.clones + 1):
                url = CLONE_URL.format(number=number)
                download(clone_dir / url.rsplit("/", 1)[-1], url)
    cog(directory / "Site01_final_adj_5mpp_surf.tif", directory / "Site01_5m_cog.tif")
    build_index(directory, args.include_global)


if __name__ == "__main__":
    main()
