"""Visibilidad de Sol y Tierra sobre el horizonte real (secciones 9.1 pasos 7, 9.5).
Owner: R3 Efemérides/Ciencia.

Entrada: efemérides del sitio (`ephem.spice`) y la máscara de horizonte (R2, `HorizonMask`).
La máscara se recibe como parámetro: este módulo no depende de cómo se calcula el terreno.
"""

from dataclasses import dataclass

import numpy as np
import numpy.typing as npt
from lumen.v1 import common_pb2

from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.visibility.disk import FloatArray, disk_fraction
from lumen_engine.visibility.eclipse import sun_occulted_by_earth
from lumen_engine.visibility.horizon_lookup import horizon_at
from lumen_engine.visibility.radii import earth_radius_deg, sun_radius_deg

BoolArray = npt.NDArray[np.bool_]

DEFAULT_SUN_MIN_FRACTION = 0.5  # centro del Sol visible (decisión Q7, sección 21)
DEFAULT_EARTH_MARGIN_DEG = 0.0


@dataclass(frozen=True)
class Visibility:
    horizon_at_sun: FloatArray  # elevación del horizonte en el azimut del Sol (°)
    horizon_at_earth: FloatArray
    sun_fraction: FloatArray  # fracción del disco solar que llega: horizonte x (1 - eclipse)
    earth_fraction: FloatArray  # fracción del disco terrestre sobre el horizonte
    eclipse_fraction: FloatArray  # fracción del disco solar oculta por la Tierra
    sun_visible: BoolArray
    earth_visible: BoolArray
    operable: BoolArray  # Sol y Tierra visibles a la vez


def resolve_thresholds(th: common_pb2.Thresholds) -> tuple[float, float]:
    """(sun_min_fraction, earth_margin_deg) aplicando los defaults de proto3 `optional`."""
    sun_min = th.sun_min_fraction if th.HasField("sun_min_fraction") else DEFAULT_SUN_MIN_FRACTION
    margin = th.earth_margin_deg if th.HasField("earth_margin_deg") else DEFAULT_EARTH_MARGIN_DEG
    return sun_min, margin


def compute(
    sun: BodyEphemeris,
    earth: BodyEphemeris,
    mask_el_deg: FloatArray,
    az_step_deg: float,
    thresholds: common_pb2.Thresholds,
) -> Visibility:
    """Cruza efemérides y horizonte según las reglas de la sección 9.5.

    - Sol visible: fracción del disco (tras eclipse) >= `sun_min_fraction` (0 = cualquier parte).
    - Tierra visible (comunicación): centro de la Tierra >= horizonte + `earth_margin_deg`.
    """
    sun_min, margin = resolve_thresholds(thresholds)
    h_sun = horizon_at(sun.az_deg, mask_el_deg, az_step_deg)
    h_earth = horizon_at(earth.az_deg, mask_el_deg, az_step_deg)

    eclipse = sun_occulted_by_earth(sun, earth)
    sun_frac = disk_fraction(sun.el_deg, h_sun, sun_radius_deg(sun.dist_km)) * (1.0 - eclipse)
    earth_frac = disk_fraction(earth.el_deg, h_earth, earth_radius_deg(earth.dist_km))

    sun_visible = sun_frac >= sun_min if sun_min > 0 else sun_frac > 0
    earth_visible = earth.el_deg >= h_earth + margin
    return Visibility(
        horizon_at_sun=h_sun,
        horizon_at_earth=h_earth,
        sun_fraction=sun_frac,
        earth_fraction=earth_frac,
        eclipse_fraction=eclipse,
        sun_visible=sun_visible,
        earth_visible=earth_visible,
        operable=sun_visible & earth_visible,
    )
