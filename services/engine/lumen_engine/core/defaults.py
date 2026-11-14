"""Valores por defecto de campos proto3 en cero (0 = "usar default"). Owner: R1."""

from lumen.v1 import common_pb2

from lumen_engine.core.constants import DEFAULT_OBS_HEIGHT_M


def normalize_lon(lon: float) -> float:
    """Longitud este a [-180, 180)."""
    return ((lon + 180.0) % 360.0) - 180.0


def obs_height(site: common_pb2.Site) -> float:
    return site.obs_height_m or DEFAULT_OBS_HEIGHT_M


def step_minutes(time_range: common_pb2.TimeRange) -> int:
    return max(time_range.step_minutes or 30, 5)
