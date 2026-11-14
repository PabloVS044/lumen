"""Descarga az/el aparentes de Sol y Tierra desde JPL Horizons para validar el motor (sección 14.1).

Uso (requiere red; CI usa el JSON grabado):
    uv run python -m tests.validation.tools.fetch_horizons

Parámetros verificados contra la API (2026-11-14): observador `coord@301` con SITE_COORD geodésico
sobre la esfera de 1737.4 km en marco MEAN_ME, QUANTITIES 4 (az/el aparentes) y 20 (distancia),
APPARENT=AIRLESS (sin refracción), tiempos en UT.
"""

import json
import random
import urllib.parse
import urllib.request
from datetime import UTC, datetime, timedelta
from pathlib import Path

API = "https://ssd.jpl.nasa.gov/api/horizons.api"
OUT = Path(__file__).resolve().parents[1] / "fixtures" / "horizons_sun_earth.json"
AU_KM = 149_597_870.7
OBS_HEIGHT_KM = 0.002  # 2 m sobre la esfera de referencia (= obs_height_m por defecto, terreno 0)

# Coordenadas de los sitios: catálogo (aprox.). Solo importa que motor y Horizons usen las mismas.
SITES = [
    {"name": "south_pole_connecting_ridge", "lat": -89.45, "lon": -137.31},
    {"name": "south_pole_malapert", "lat": -86.0, "lon": 0.0},
    {"name": "midlat_apollo15", "lat": 26.132, "lon": 3.634},
    {"name": "farside_change4", "lat": -45.44, "lon": 177.60},
    {"name": "equatorial_apollo11", "lat": 0.674, "lon": 23.473},
]
BODIES = {"SUN": "10", "EARTH": "399"}
N_INSTANTS = 20
SEED = 20261114


def instants() -> list[datetime]:
    rng = random.Random(SEED)
    start = datetime(2026, 1, 1, tzinfo=UTC)
    span_min = int((datetime(2029, 1, 1, tzinfo=UTC) - start).total_seconds() // 60)
    return sorted(start + timedelta(minutes=rng.randrange(span_min)) for _ in range(N_INSTANTS))


def query(body_id: str, site: dict[str, object], times: list[datetime]) -> dict[str, object]:
    params = {
        "format": "json",
        "COMMAND": f"'{body_id}'",
        "OBJ_DATA": "'NO'",
        "MAKE_EPHEM": "'YES'",
        "EPHEM_TYPE": "'OBSERVER'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{site['lon']},{site['lat']},{OBS_HEIGHT_KM}'",
        "TLIST": " ".join(f"'{t:%Y-%m-%d %H:%M:%S}'" for t in times),
        "TIME_TYPE": "'UT'",
        "QUANTITIES": "'4,20'",
        "ANG_FORMAT": "'DEG'",
        "APPARENT": "'AIRLESS'",
        "CSV_FORMAT": "'YES'",
        "EXTRA_PREC": "'YES'",
    }
    url = f"{API}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=60) as resp:
        payload = json.load(resp)
    result: str = payload["result"]
    rows = result[result.index("$$SOE") + 5 : result.index("$$EOE")].strip().splitlines()
    samples = []
    for row, t in zip(rows, times, strict=True):
        cols = [c.strip() for c in row.split(",")]
        if not cols[0].startswith(f"{t:%Y-%b-%d %H:%M}"):
            raise ValueError(f"Horizons row {cols[0]!r} does not match requested {t}")
        samples.append(
            {
                "utc": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "az_deg": float(cols[3]),
                "el_deg": float(cols[4]),
                "dist_km": float(cols[5]) * AU_KM,
            }
        )
    return {"version": payload["signature"]["version"], "samples": samples}


def main() -> None:
    times = instants()
    cases = []
    version = ""
    for site in SITES:
        for body, body_id in BODIES.items():
            res = query(body_id, site, times)
            version = str(res["version"])
            cases.append({"site": site, "body": body, "samples": res["samples"]})
    doc = {
        "meta": {
            "source": "JPL Horizons API",
            "api_version": version,
            "fetched_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "observer": "coord@301 geodetic, sphere 1737.4 km, MEAN_ME frame",
            "height_km": OBS_HEIGHT_KM,
            "quantities": "4 (apparent az/el, airless), 20 (range)",
            "ephemeris": "DE441 (Horizons default)",
            "seed": SEED,
        },
        "cases": cases,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(doc, indent=1) + "\n", encoding="utf-8")
    print(f"{len(cases)} cases x {len(times)} instants -> {OUT}")


if __name__ == "__main__":
    main()
