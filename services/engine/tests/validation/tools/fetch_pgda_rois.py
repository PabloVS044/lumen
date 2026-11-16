"""Descarga las RoIs de PGDA Site01 (regiones con iluminación media > 70 %) para la validación 14.3.

Uso (requiere red; CI usa el JSON grabado). pyshp no es dependencia del motor:
    uv run --with pyshp python -m tests.validation.tools.fetch_pgda_rois

Fuente: https://pgda.gsfc.nasa.gov/products/78 (Barker et al. 2021). El shapefile
`Site01_ROIs` se deriva de `Site01_final_adj_5mpp_01_regionProps_avgillGT070`: regiones con
iluminación media > 70 % a 1 m sobre la superficie entre 2024-01-01 y 2026-01-01.
Coordenadas: estereográfica polar sur (R = 1737.4 km), marco MOON_ME (DE421).
"""

import hashlib
import io
import json
import tarfile
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

import shapefile  # type: ignore[import-not-found]  # pyshp, solo para regenerar el fixture

URL = "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/Site01/Site01_ROIs.tgz"
OUT = Path(__file__).resolve().parents[1] / "fixtures" / "pgda_site01_rois.json"


def main() -> None:
    with urllib.request.urlopen(URL, timeout=60) as resp:
        data = resp.read()
    files = {}
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        for member in tar.getmembers():
            if member.isfile() and member.name.endswith((".shp", ".shx", ".dbf")):
                extracted = tar.extractfile(member)
                if extracted is not None:
                    files[member.name.rsplit(".", 1)[1]] = io.BytesIO(extracted.read())
    reader = shapefile.Reader(shp=files["shp"], shx=files["shx"], dbf=files["dbf"])
    rois = [
        {"roi": i, "x_m": float(rec[0]), "y_m": float(rec[1])}
        for i, rec in enumerate(reader.records(), start=1)
    ]
    doc = {
        "meta": {
            "source": "NASA PGDA product 78 (Barker et al. 2021), Site01_ROIs.tgz",
            "url": URL,
            "sha256": hashlib.sha256(data).hexdigest(),
            "fetched_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "definition": "avg illumination > 70% at 1 m, 2024-01-01 to 2026-01-01",
            "projection": "south polar stereographic, R=1737400 m, MOON_ME (DE421)",
            "point": "label point of each region (pixel center inside it)",
        },
        "rois": rois,
    }
    OUT.write_text(json.dumps(doc, indent=1) + "\n", encoding="utf-8")
    print(f"{len(rois)} RoIs -> {OUT}")


if __name__ == "__main__":
    main()
