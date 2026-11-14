"""Visibilidad de un sitio real: máscara de horizonte (R2) + efemérides + reglas 9.5.
Owner: R3 Efemérides/Ciencia.

Punto único para los RPC de R3 que necesitan terreno (ListEvents, Simulate, WhatIf). Mientras
`horizon.mask.compute` no exista, propaga NOT_IMPLEMENTED: no se usa un horizonte plano en silencio.
"""

from dataclasses import dataclass

import numpy as np
from lumen.v1 import common_pb2, horizon_pb2

from lumen_engine.core.constants import DEFAULT_AZ_STEP_DEG, DEFAULT_MAX_RANGE_KM
from lumen_engine.ephem.spice import EphemerisSeries, series
from lumen_engine.horizon import mask as horizon_mask
from lumen_engine.visibility.compute import Visibility, compute


@dataclass(frozen=True)
class SiteVisibility:
    ephemeris: EphemerisSeries
    mask: horizon_pb2.HorizonMask
    visibility: Visibility


def site_visibility(
    site: common_pb2.Site,
    time_range: common_pb2.TimeRange,
    thresholds: common_pb2.Thresholds | None = None,
) -> SiteVisibility:
    mask = horizon_mask.compute(
        site, az_step_deg=DEFAULT_AZ_STEP_DEG, max_range_km=DEFAULT_MAX_RANGE_KM
    )
    eph = series(site, time_range, terrain_height_m=mask.observer.terrain_height_m)
    vis = compute(
        eph.sun,
        eph.earth,
        np.asarray(mask.elevation_deg, dtype=np.float64),
        mask.az_step_deg,
        thresholds or common_pb2.Thresholds(),
    )
    return SiteVisibility(ephemeris=eph, mask=mask, visibility=vis)
