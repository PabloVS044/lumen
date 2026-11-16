"""Validación 14.3 contra fuente primaria: RoIs de PGDA Site01 (Barker et al. 2021).

PGDA define esas regiones como las de iluminación media > 70 % a 1 m entre 2024-01-01 y
2026-01-01. El motor, con su propio horizonte (DEM 5 m + 80 m), debe reproducirlo en cada RoI.
"""

import pytest

from tests.validation.compare import PGDA_MIN_ILLUMINATION_PCT, pgda_site01_illumination

pytestmark = [pytest.mark.requires_dem, pytest.mark.requires_kernels, pytest.mark.slow]


def test_every_pgda_site01_roi_is_above_70_percent() -> None:
    results = pgda_site01_illumination()
    assert [r.roi for r in results] == list(range(1, 8))
    worst = min(results, key=lambda r: r.illumination_pct)
    assert worst.illumination_pct > PGDA_MIN_ILLUMINATION_PCT, worst
