"""Simulador de energía/batería. Owner: R3 Efemérides/Ciencia. Sección 9.8."""

from lumen.v1 import analysis_pb2, power_pb2

from lumen_engine.core.errors import NotImplementedYetError


def simulate(
    series: analysis_pb2.Series, config: power_pb2.PowerConfig
) -> power_pb2.SimulateResponse:
    raise NotImplementedYetError("power simulation")
