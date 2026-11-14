"""Simulación de energía para un escenario real (sitio + rango). Owner: R3 Efemérides/Ciencia."""

from datetime import datetime

from lumen.v1 import power_pb2

from lumen_engine.power.simulator import PowerParams, PowerResult, simulate
from lumen_engine.visibility.site import site_visibility


def simulate_scenario(req: power_pb2.SimulateRequest) -> tuple[list[datetime], PowerResult]:
    """Devuelve (instantes, resultado). Valida la configuración antes de calcular nada."""
    params = PowerParams.from_proto(req.config)
    sv = site_visibility(req.scenario.site, req.scenario.range)
    eph = sv.ephemeris
    result = simulate(eph.grid, eph.sun, sv.visibility.sun_fraction, params)
    return list(eph.grid.datetimes()), result
