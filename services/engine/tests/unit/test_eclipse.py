from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
import spiceypy as sp
from hypothesis import given
from hypothesis import strategies as st

from lumen_engine.visibility.eclipse import occulted_fraction, sun_occulted_by_earth


@pytest.mark.parametrize(
    ("sep", "expected"),
    [(2.0, 0.0), (1.215, 0.0), (0.0, 1.0), (0.68, 1.0)],
)
def test_occulted_fraction_limits(sep: float, expected: float) -> None:
    # Sol r=0.265°, Tierra r=0.95°: separados más que la suma -> 0; Sol dentro de la Tierra -> 1
    got = occulted_fraction(np.array([sep]), np.array([0.265]), np.array([0.95]))
    assert got[0] == pytest.approx(expected)


def test_small_occulter_covers_area_ratio() -> None:
    got = occulted_fraction(np.array([0.0]), np.array([1.0]), np.array([0.5]))
    assert got[0] == pytest.approx(0.25)


@given(st.floats(min_value=0, max_value=1.3, allow_nan=False))
def test_occulted_fraction_is_bounded_and_monotonic(sep: float) -> None:
    seps = np.array([sep, sep + 0.01])
    f = occulted_fraction(seps, np.full(2, 0.265), np.full(2, 0.95))
    assert np.all((f >= 0) & (f <= 1))
    assert f[1] <= f[0] + 1e-12


@pytest.mark.requires_kernels
def test_total_lunar_eclipse_2026_03_03_matches_spice_occult() -> None:
    """Eclipse lunar total del 2026-03-03 contra una referencia independiente: CSPICE occult().

    occult() observa desde el centro lunar, así que el motor se evalúa en el punto sub-Tierra de ese
    instante (0.49°, 4.74°), donde la dirección a la Tierra coincide con la del centro. Desde otros
    sitios la ventana se desplaza por paralaje (Apollo 11: ~+10 min), que es un efecto real.
    SPICE usa el elipsoide terrestre (6378/6357 km) y el motor una esfera de 6371 km: margen 3 min.
    """
    from lumen_engine.ephem.kernels import load_kernels
    from lumen_engine.ephem.spice import body_azel

    load_kernels()
    t0 = datetime(2026, 3, 3, 8, 0, tzinfo=UTC)
    times = [t0 + timedelta(minutes=k) for k in range(8 * 60)]
    ets = np.array([sp.str2et(t.strftime("%Y-%m-%dT%H:%M:%S")) for t in times])
    lat, lon = 0.49, 4.74
    frac = sun_occulted_by_earth(
        body_azel("SUN", ets, lat, lon, obs_height_m=2.0),
        body_azel("EARTH", ets, lat, lon, obs_height_m=2.0),
    )
    codes = [
        sp.occult(
            "SUN", "ELLIPSOID", "IAU_SUN", "EARTH", "ELLIPSOID", "IAU_EARTH", "LT", "MOON", et
        )
        for et in ets
    ]

    def window(flags: list[bool]) -> tuple[datetime, datetime]:
        hits = [t for t, f in zip(times, flags, strict=True) if f]
        return hits[0], hits[-1]

    tol = timedelta(minutes=3)
    for ours, ref in [
        (window([f > 0 for f in frac]), window([c != 0 for c in codes])),
        (window([f >= 1 - 1e-12 for f in frac]), window([c == -3 for c in codes])),
    ]:
        assert abs(ours[0] - ref[0]) <= tol, (ours, ref)
        assert abs(ours[1] - ref[1]) <= tol, (ours, ref)
    assert frac[0] == 0.0 and frac[-1] == 0.0
