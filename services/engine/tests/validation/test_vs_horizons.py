"""Validación de efemérides contra JPL Horizons (sección 14.1)."""

import pytest

from tests.validation.compare import TOLERANCE_DEG, CaseErrors, compare_all

pytestmark = pytest.mark.requires_kernels

# Hoy el acuerdo es ~5e-7°. Esta cota detecta regresiones mucho antes de llegar a la del doc.
REGRESSION_GUARD_DEG = 1e-5


@pytest.fixture(scope="module")
def errors() -> list[CaseErrors]:
    return compare_all()


def test_fixture_covers_all_sites_and_bodies(errors: list[CaseErrors]) -> None:
    assert len(errors) == 10
    assert {e.body for e in errors} == {"SUN", "EARTH"}


@pytest.mark.parametrize("bound", [TOLERANCE_DEG, REGRESSION_GUARD_DEG])
def test_azimuth_and_elevation_within_bound(errors: list[CaseErrors], bound: float) -> None:
    worst = max(errors, key=lambda e: max(e.max_az_deg, e.max_el_deg))
    assert worst.max_el_deg <= bound, worst
    assert worst.max_az_deg <= bound, worst


def test_range_agrees(errors: list[CaseErrors]) -> None:
    assert max(e.max_range_rel for e in errors) < 1e-6
