"""Simulador de energía/batería de un lander (sección 9.8, HU-07). Owner: R3 Efemérides/Ciencia.

Convención temporal: `soc_pct[i]` es el estado de carga en el instante i. El intervalo
[tᵢ, tᵢ₊₁) se integra con la potencia de tᵢ, así que la última muestra no integra.

Limitaciones (sección 9.8): no modela temperatura, polvo, sombreado del propio lander, RTG ni
calentadores. Ver docs/methodology.md.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta

import numpy as np
from lumen.v1 import power_pb2

from lumen_engine.core.errors import EngineError
from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.metrics.compute import solar_irradiance_w_m2
from lumen_engine.visibility.disk import FloatArray

Orientation = power_pb2.PanelOrientation


@dataclass(frozen=True)
class PowerParams:
    """Parámetros resueltos. Defaults = preset "lander pequeño" de la sección 9.8."""

    panel_area_m2: float = 2.0
    efficiency: float = 0.28
    orientation: Orientation = power_pb2.PANEL_ORIENTATION_VERTICAL_TRACKING
    panel_azimuth_deg: float | None = None
    battery_wh: float = 2000.0
    soc0_pct: float = 100.0
    max_dod_pct: float = 80.0
    load_day_w: float = 150.0
    load_night_w: float = 60.0
    battery_efficiency: float = 0.95

    @classmethod
    def from_proto(cls, cfg: power_pb2.PowerConfig) -> "PowerParams":
        """Campos `optional` ausentes toman el default; un 0 explícito se respeta."""
        defaults = cls()
        values = {
            name: getattr(cfg, name) if cfg.HasField(name) else getattr(defaults, name)
            for name in (
                "panel_area_m2",
                "efficiency",
                "battery_wh",
                "soc0_pct",
                "max_dod_pct",
                "load_day_w",
                "load_night_w",
                "battery_efficiency",
            )
        }
        orientation = cfg.orientation or defaults.orientation
        azimuth = cfg.panel_azimuth_deg if cfg.HasField("panel_azimuth_deg") else None
        if orientation == power_pb2.PANEL_ORIENTATION_VERTICAL_FIXED and azimuth is None:
            raise EngineError(
                "PANEL_AZIMUTH_REQUIRED",
                "panel_azimuth_deg is required for a fixed vertical panel.",
            )
        return cls(orientation=orientation, panel_azimuth_deg=azimuth, **values)


@dataclass(frozen=True)
class PowerResult:
    p_gen_w: FloatArray
    p_load_w: FloatArray
    soc_pct: FloatArray
    survives: bool
    first_brownout_time: datetime | None
    min_soc_pct: float
    # Energía mínima alcanzada por encima de la reserva (C·(1−DoD)). Si hubo brownout es negativa:
    # energía que la carga pidió y la batería no pudo entregar.
    energy_margin_wh: float


def _geometry_factor(sun: BodyEphemeris, params: PowerParams) -> FloatArray:
    el = np.radians(sun.el_deg)
    if params.orientation == power_pb2.PANEL_ORIENTATION_HORIZONTAL:
        out: FloatArray = np.sin(np.maximum(el, 0.0))
    elif params.orientation == power_pb2.PANEL_ORIENTATION_VERTICAL_FIXED:
        az_off = np.radians(sun.az_deg - (params.panel_azimuth_deg or 0.0))
        out = np.maximum(0.0, np.cos(el) * np.cos(az_off))
    else:  # VERTICAL_TRACKING
        out = np.cos(el)
    return out


def simulate(
    grid: TimeGrid, sun: BodyEphemeris, sun_fraction: FloatArray, params: PowerParams
) -> PowerResult:
    """Integra generación y consumo según la sección 9.8."""
    step_h = grid.step_minutes / 60.0
    p_gen = (
        params.efficiency
        * params.panel_area_m2
        * solar_irradiance_w_m2(sun.dist_km)
        * sun_fraction
        * _geometry_factor(sun, params)
    )
    p_load = np.where(sun_fraction > 0, params.load_day_w, params.load_night_w).astype(np.float64)

    capacity = params.battery_wh
    reserve = capacity * (1.0 - params.max_dod_pct / 100.0)
    energy = np.empty(len(grid))
    e = capacity * params.soc0_pct / 100.0
    unserved = 0.0
    brownout_index: int | None = None
    for i in range(len(grid)):
        energy[i] = e
        if i == len(grid) - 1:
            break
        delta = (p_gen[i] - p_load[i]) * step_h
        e += delta * params.battery_efficiency if delta > 0 else delta / params.battery_efficiency
        if e < reserve:
            unserved += (reserve - e) * params.battery_efficiency
            e = reserve
            if brownout_index is None:
                brownout_index = i + 1
        e = min(e, capacity)

    times = grid.datetimes()
    brownout_time = None
    if brownout_index is not None:
        brownout_time = times[brownout_index - 1] + timedelta(minutes=grid.step_minutes)
    min_energy = float(np.min(energy))
    return PowerResult(
        p_gen_w=p_gen,
        p_load_w=p_load,
        soc_pct=100.0 * energy / capacity,
        survives=brownout_index is None,
        first_brownout_time=brownout_time,
        min_soc_pct=100.0 * min_energy / capacity,
        energy_margin_wh=-unserved if unserved > 0 else min_energy - reserve,
    )
