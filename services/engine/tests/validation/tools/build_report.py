"""Genera el reporte público de validación que sirve `ValidationService.GetReport` (HU-13).

Uso: uv run python -m tests.validation.tools.build_report
`tests/validation/test_report.py` falla si el reporte commiteado no coincide con el cálculo.
"""

import json
from pathlib import Path
from typing import Any

from tests.validation.compare import (
    ECLIPSE_TOLERANCE_MIN,
    PGDA_MIN_ILLUMINATION_PCT,
    TOLERANCE_DEG,
    compare_all,
    eclipse_vs_spice_minutes,
    pgda_site01_illumination,
)

# Checks que necesitan DEMs LOLA (≈312 MB, no están en CI): solo se recalculan con DEM instalado.
DEM_CHECKS = {"illumination_site01_rois_vs_pgda"}

REPORT = Path(__file__).resolve().parents[3] / "lumen_engine" / "validation" / "report.json"


def _dem_available() -> bool:
    from lumen_engine.dem.index import layers

    return bool(layers())


def build(include_dem: bool | None = None) -> list[dict[str, Any]]:
    errors = compare_all()
    checks = []
    for body, name in (("SUN", "del Sol"), ("EARTH", "de la Tierra")):
        cases = [e for e in errors if e.body == body]
        worst = max(max(e.max_az_deg, e.max_el_deg) for e in cases)
        checks.append(
            {
                "id": f"ephemeris_{body.lower()}_vs_horizons",
                "description": (
                    f"Azimut y elevación aparentes {name} vs JPL Horizons "
                    f"({len(cases)} sitios × 20 instantes, 2026–2028)"
                ),
                "tolerance": TOLERANCE_DEG,
                "max_error": float(f"{worst:.3e}"),
                "passed": worst <= TOLERANCE_DEG,
                "notes": "Grados; el error de azimut se mide como arco (Δaz·cos el).",
            }
        )
    minutes = eclipse_vs_spice_minutes()
    checks.append(
        {
            "id": "eclipse_vs_spice_occult",
            "description": (
                "Ventanas parcial y total del eclipse lunar del 2026-03-03 vs CSPICE occult()"
            ),
            "tolerance": ECLIPSE_TOLERANCE_MIN,
            "max_error": minutes,
            "passed": minutes <= ECLIPSE_TOLERANCE_MIN,
            "notes": "Minutos, resolución de 1 min. SPICE usa el elipsoide terrestre; el motor, "
            "una esfera de 6371 km.",
        }
    )
    if include_dem if include_dem is not None else _dem_available():
        rois = pgda_site01_illumination()
        dimmest = min(rois, key=lambda r: r.illumination_pct)
        brightest = max(rois, key=lambda r: r.illumination_pct)
        checks.append(
            {
                "id": "illumination_site01_rois_vs_pgda",
                "description": (
                    "Iluminación media 2024–2025 a 1 m en las 7 RoIs de PGDA Site01, definidas "
                    "por PGDA como > 70 % (Barker et al. 2021)"
                ),
                "tolerance": PGDA_MIN_ILLUMINATION_PCT,
                "max_error": round(
                    max(0.0, PGDA_MIN_ILLUMINATION_PCT - dimmest.illumination_pct), 3
                ),
                "passed": dimmest.illumination_pct > PGDA_MIN_ILLUMINATION_PCT,
                "notes": (
                    f"% de disco solar visible. Mín. {dimmest.illumination_pct:.1f} % "
                    f"(RoI {dimmest.roi}), máx. {brightest.illumination_pct:.1f} % "
                    f"(RoI {brightest.roi}). max_error = déficit bajo 70 %."
                ),
            }
        )
    return checks


def main() -> None:
    REPORT.write_text(json.dumps({"checks": build()}, indent=2, ensure_ascii=False) + "\n")
    print(f"-> {REPORT}")


if __name__ == "__main__":
    main()
