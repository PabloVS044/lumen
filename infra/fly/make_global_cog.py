"""Convierte el DEM global LOLA `LDEM_128.JP2` a COG y arma un directorio DEM completo.

Por qué: las lecturas por ventana de un JP2 (647 MB) son lentas en frío (5-38 s por sitio no polar).
El doc técnico (8.1, "Notas de procesamiento") prescribe COG con overviews.

Qué hace:
  1. Copia el raster con el driver COG de GDAL: **mismos enteros** int16 y nodata (sin reescalar
     alturas; `height_scale: 0.5` del índice sigue valiendo), DEFLATE + PREDICTOR=2, bloques de 512,
     overviews promediados.
  2. Con `--index`/`--out-dir` escribe un `index.json` nuevo en `--out-dir` donde la capa
     `PDS_LOLA_global_128ppd` apunta a `LDEM_128_cog.tif` (mismo id, resolución, límites y
     height_scale), y enlaza (hardlink, o copia si es otro dispositivo) los archivos de las demás
     capas. `--out-dir` queda como directorio DEM completo y listo para subir.

No modifica el índice ni los datos originales.

Uso:
  python infra/fly/make_global_cog.py --src data/local/dem/LDEM_128.JP2 \\
      --index data/local/dem/index.json --out-dir data/local/dem_cog
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path

import rasterio
from rasterio.shutil import copy as rio_copy

GLOBAL_ID = "PDS_LOLA_global_128ppd"
COG_NAME = "LDEM_128_cog.tif"


def build_cog(src: Path, dst: Path) -> None:
    """JP2 -> COG preservando valores enteros (predictor 2 solo es válido para enteros)."""
    with rasterio.open(src) as ds:
        if ds.dtypes[0] not in ("int16", "uint16", "int32", "uint32", "uint8"):
            raise SystemExit(f"{src}: dtype {ds.dtypes[0]} no entero; no se aplica PREDICTOR=2")
    rio_copy(
        src,
        dst,
        driver="COG",
        COMPRESS="DEFLATE",
        PREDICTOR=2,
        BLOCKSIZE=512,
        OVERVIEWS="IGNORE_EXISTING",
        OVERVIEW_RESAMPLING="AVERAGE",
        NUM_THREADS="ALL_CPUS",
        BIGTIFF="IF_SAFER",
    )


def _link_or_copy(src: Path, dst: Path) -> None:
    if dst.exists():
        dst.unlink()
    try:
        os.link(src, dst)
    except OSError:
        shutil.copy2(src, dst)


def write_dem_dir(index_in: Path, out_dir: Path) -> Path:
    """Escribe `out_dir/index.json` (capa global -> COG) y trae los demás archivos."""
    index = json.loads(index_in.read_text(encoding="utf-8"))
    src_dir = index_in.parent
    layers = []
    for layer in index["layers"]:
        if layer["id"] == GLOBAL_ID:
            layer = {**layer, "file": COG_NAME}  # resto igual: resolución, bounds, height_scale
        else:
            for key in ("file", "ldec_file", "slope_file"):
                name = layer.get(key)
                if name and not name.startswith(("http://", "https://")):
                    _link_or_copy(src_dir / name, out_dir / name)
        layers.append(layer)
    if not any(layer["id"] == GLOBAL_ID for layer in layers):
        raise SystemExit(f"{index_in} no contiene la capa {GLOBAL_ID}")
    out = out_dir / "index.json"
    out.write_text(json.dumps({**index, "layers": layers}, indent=2) + "\n", encoding="utf-8")
    return out


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    p.add_argument("--src", type=Path, required=True, help="LDEM_128.JP2 de origen")
    p.add_argument("--dst", type=Path, help=f"COG de salida (por defecto <out-dir>/{COG_NAME})")
    p.add_argument("--index", type=Path, help="index.json de origen (para --out-dir)")
    p.add_argument("--out-dir", type=Path, help="directorio DEM completo a generar")
    a = p.parse_args()
    if bool(a.index) != bool(a.out_dir):
        p.error("--index y --out-dir van juntos")
    dst = a.dst or (a.out_dir / COG_NAME if a.out_dir else None)
    if dst is None:
        p.error("indica --dst o --out-dir")
    dst.parent.mkdir(parents=True, exist_ok=True)
    build_cog(a.src, dst)
    print(
        f"COG: {dst} ({dst.stat().st_size / 1e6:.0f} MB; JP2 {a.src.stat().st_size / 1e6:.0f} MB)"
    )
    if a.out_dir:
        print(f"índice: {write_dem_dir(a.index, a.out_dir)}")


if __name__ == "__main__":
    main()
