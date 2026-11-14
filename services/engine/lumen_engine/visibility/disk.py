"""Fracción visible de disco y eclipses. Owner: Efemérides/Ciencia. Sección 9.5 y 9.4.4."""

import numpy as np
import numpy.typing as npt

FloatArray = npt.NDArray[np.float64]


def disk_fraction(
    body_el_deg: FloatArray, horizon_el_deg: FloatArray, radius_deg: FloatArray
) -> FloatArray:
    """Fracción del disco sobre el horizonte, aproximando el horizonte como recta.

    s = (e - H) / r; s>=1 -> 1; s<=-1 -> 0; si no (θ - sin θ)/2π con θ = 2·acos(-s).
    """
    s = np.clip((body_el_deg - horizon_el_deg) / radius_deg, -1.0, 1.0)
    theta = 2.0 * np.arccos(-s)
    frac: FloatArray = (theta - np.sin(theta)) / (2.0 * np.pi)
    return frac
