"""Eclipses: el Sol ocultado por la Tierra visto desde el sitio (secciones 4.5 y 9.4.4).
Owner: R3 Efemérides/Ciencia.

Desde la Luna, un eclipse lunar (visto desde la Tierra) es un eclipse de Sol por la Tierra:
la energía cae aunque el horizonte esté despejado. Se calcula la fracción del disco solar
cubierta por el disco terrestre (intersección de dos círculos en aproximación plana, adecuada
para radios < 1°). No modela la atmósfera terrestre (anillo refractado), que en la práctica deja
pasar algo de luz en la totalidad. Validado contra CSPICE occult() en el eclipse del 2026-03-03.
"""

import numpy as np

from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.visibility.disk import FloatArray
from lumen_engine.visibility.radii import earth_radius_deg, sun_radius_deg


def _unit_vectors(az_deg: FloatArray, el_deg: FloatArray) -> FloatArray:
    az, el = np.radians(az_deg), np.radians(el_deg)
    return np.stack([np.cos(el) * np.sin(az), np.cos(el) * np.cos(az), np.sin(el)], axis=-1)


def angular_separation_deg(a: BodyEphemeris, b: BodyEphemeris) -> FloatArray:
    """Separación angular entre dos cuerpos a partir de sus az/el (fórmula estable con atan2)."""
    u, v = _unit_vectors(a.az_deg, a.el_deg), _unit_vectors(b.az_deg, b.el_deg)
    cross = np.linalg.norm(np.cross(u, v), axis=-1)
    dot = np.sum(u * v, axis=-1)
    out: FloatArray = np.degrees(np.arctan2(cross, dot))
    return out


def occulted_fraction(
    sep_deg: FloatArray, r_sun_deg: FloatArray, r_occ_deg: FloatArray
) -> FloatArray:
    """Fracción del disco solar (radio r_sun) cubierta por un disco r_occ separado `sep` grados."""
    d, r1, r2 = (np.asarray(x, dtype=np.float64) for x in (sep_deg, r_sun_deg, r_occ_deg))
    out = np.zeros_like(d)

    inside = d <= np.abs(r2 - r1)
    out[inside] = np.minimum(1.0, (r2[inside] / r1[inside]) ** 2)

    lens = (d < r1 + r2) & ~inside
    dl, a, b = d[lens], r1[lens], r2[lens]
    alpha = np.arccos(np.clip((dl**2 + a**2 - b**2) / (2 * dl * a), -1.0, 1.0))
    beta = np.arccos(np.clip((dl**2 + b**2 - a**2) / (2 * dl * b), -1.0, 1.0))
    area = a**2 * (alpha - np.sin(2 * alpha) / 2) + b**2 * (beta - np.sin(2 * beta) / 2)
    out[lens] = area / (np.pi * a**2)
    return np.clip(out, 0.0, 1.0)


def sun_occulted_by_earth(sun: BodyEphemeris, earth: BodyEphemeris) -> FloatArray:
    """Fracción del disco solar oculta por la Tierra en cada instante (0 = sin eclipse)."""
    return occulted_fraction(
        angular_separation_deg(sun, earth),
        sun_radius_deg(sun.dist_km),
        earth_radius_deg(earth.dist_km),
    )
