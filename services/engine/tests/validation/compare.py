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
