"""Comparación motor vs JPL Horizons a partir de los fixtures grabados (sección 14.1)."""

import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import spiceypy as sp

from lumen_engine.core.constants import DEFAULT_OBS_HEIGHT_M
from lumen_engine.ephem.geometry import FloatArray
from lumen_engine.ephem.kernels import load_kernels
from lumen_engine.ephem.spice import body_azel

FIXTURE = Path(__file__).resolve().parent / "fixtures" / "horizons_sun_earth.json"
TOLERANCE_DEG = 0.01


@dataclass(frozen=True)
class CaseErrors:
    site: str
    body: str
    max_az_deg: float
    max_el_deg: float
    max_range_rel: float


def _wrap(d: FloatArray) -> FloatArray:
    return (d + 180.0) % 360.0 - 180.0


def compare_all(fixture: Path = FIXTURE) -> list[CaseErrors]:
    load_kernels()
    doc = json.loads(fixture.read_text(encoding="utf-8"))
    out = []
    for case in doc["cases"]:
        samples = case["samples"]
        ets = np.array([sp.str2et(s["utc"].rstrip("Z")) for s in samples])
        site = case["site"]
        got = body_azel(
            case["body"], ets, site["lat"], site["lon"], obs_height_m=DEFAULT_OBS_HEIGHT_M
        )
        az = np.array([s["az_deg"] for s in samples])
        el = np.array([s["el_deg"] for s in samples])
        rng = np.array([s["dist_km"] for s in samples])
        # Azimut horizontal: el error angular real escala con cos(el)
        az_err = np.abs(_wrap(got.az_deg - az)) * np.cos(np.radians(el))
        out.append(
            CaseErrors(
                site=site["name"],
                body=case["body"],
                max_az_deg=float(np.max(az_err)),
                max_el_deg=float(np.max(np.abs(got.el_deg - el))),
                max_range_rel=float(np.max(np.abs(got.dist_km - rng) / rng)),
            )
        )
    return out


ECLIPSE_TOLERANCE_MIN = 3.0
# Punto sub-Tierra el 2026-03-03 11:30 UTC: ahí la dirección a la Tierra coincide con la del centro
# lunar, que es desde donde observa CSPICE occult().
_ECLIPSE_SITE = (0.49, 4.74)


def eclipse_vs_spice_minutes() -> float:
    """Máx. diferencia (min) entre los bordes parcial/total del eclipse del 2026-03-03 según el
    motor y según CSPICE occult(), a resolución de 1 minuto."""
    from datetime import UTC, datetime, timedelta

    from lumen_engine.visibility.eclipse import sun_occulted_by_earth

    load_kernels()
    t0 = datetime(2026, 3, 3, 8, 0, tzinfo=UTC)
    times = [t0 + timedelta(minutes=k) for k in range(8 * 60)]
    ets = np.array([sp.str2et(t.strftime("%Y-%m-%dT%H:%M:%S")) for t in times])
    lat, lon = _ECLIPSE_SITE
    frac = sun_occulted_by_earth(
        body_azel("SUN", ets, lat, lon, obs_height_m=DEFAULT_OBS_HEIGHT_M),
        body_azel("EARTH", ets, lat, lon, obs_height_m=DEFAULT_OBS_HEIGHT_M),
    )
    codes = [
        sp.occult("SUN", "ELLIPSOID", "IAU_SUN", "EARTH", "ELLIPSOID", "IAU_EARTH", "LT", "MOON", e)
        for e in ets
    ]

    def edges(flags: list[bool]) -> tuple[datetime, datetime]:
        hits = [t for t, f in zip(times, flags, strict=True) if f]
        return hits[0], hits[-1]

    worst = 0.0
    for ours, ref in [
        (edges([f > 0 for f in frac]), edges([c != 0 for c in codes])),
        (edges([f >= 1 - 1e-12 for f in frac]), edges([c == -3 for c in codes])),
    ]:
        for a, b in zip(ours, ref, strict=True):
            worst = max(worst, abs((a - b).total_seconds()) / 60.0)
    return worst
