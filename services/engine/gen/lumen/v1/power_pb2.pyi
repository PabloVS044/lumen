import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from lumen.v1 import analysis_pb2 as _analysis_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class PanelOrientation(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    PANEL_ORIENTATION_UNSPECIFIED: _ClassVar[PanelOrientation]
    PANEL_ORIENTATION_VERTICAL_TRACKING: _ClassVar[PanelOrientation]
    PANEL_ORIENTATION_HORIZONTAL: _ClassVar[PanelOrientation]
    PANEL_ORIENTATION_VERTICAL_FIXED: _ClassVar[PanelOrientation]
PANEL_ORIENTATION_UNSPECIFIED: PanelOrientation
PANEL_ORIENTATION_VERTICAL_TRACKING: PanelOrientation
PANEL_ORIENTATION_HORIZONTAL: PanelOrientation
PANEL_ORIENTATION_VERTICAL_FIXED: PanelOrientation

class PowerConfig(_message.Message):
    __slots__ = ()
    PANEL_AREA_M2_FIELD_NUMBER: _ClassVar[int]
    EFFICIENCY_FIELD_NUMBER: _ClassVar[int]
    ORIENTATION_FIELD_NUMBER: _ClassVar[int]
    PANEL_AZIMUTH_DEG_FIELD_NUMBER: _ClassVar[int]
    BATTERY_WH_FIELD_NUMBER: _ClassVar[int]
    SOC0_PCT_FIELD_NUMBER: _ClassVar[int]
    MAX_DOD_PCT_FIELD_NUMBER: _ClassVar[int]
    LOAD_DAY_W_FIELD_NUMBER: _ClassVar[int]
    LOAD_NIGHT_W_FIELD_NUMBER: _ClassVar[int]
    BATTERY_EFFICIENCY_FIELD_NUMBER: _ClassVar[int]
    panel_area_m2: float
    efficiency: float
    orientation: PanelOrientation
    panel_azimuth_deg: float
    battery_wh: float
    soc0_pct: float
    max_dod_pct: float
    load_day_w: float
    load_night_w: float
    battery_efficiency: float
    def __init__(self, panel_area_m2: _Optional[float] = ..., efficiency: _Optional[float] = ..., orientation: _Optional[_Union[PanelOrientation, str]] = ..., panel_azimuth_deg: _Optional[float] = ..., battery_wh: _Optional[float] = ..., soc0_pct: _Optional[float] = ..., max_dod_pct: _Optional[float] = ..., load_day_w: _Optional[float] = ..., load_night_w: _Optional[float] = ..., battery_efficiency: _Optional[float] = ...) -> None: ...

class SimulateRequest(_message.Message):
    __slots__ = ()
    SCENARIO_FIELD_NUMBER: _ClassVar[int]
    CONFIG_FIELD_NUMBER: _ClassVar[int]
    scenario: _analysis_pb2.Scenario
    config: PowerConfig
    def __init__(self, scenario: _Optional[_Union[_analysis_pb2.Scenario, _Mapping]] = ..., config: _Optional[_Union[PowerConfig, _Mapping]] = ...) -> None: ...

class SimulateResponse(_message.Message):
    __slots__ = ()
    TIME_FIELD_NUMBER: _ClassVar[int]
    P_GEN_W_FIELD_NUMBER: _ClassVar[int]
    P_LOAD_W_FIELD_NUMBER: _ClassVar[int]
    SOC_PCT_FIELD_NUMBER: _ClassVar[int]
    SURVIVES_FIELD_NUMBER: _ClassVar[int]
    FIRST_BROWNOUT_TIME_FIELD_NUMBER: _ClassVar[int]
    MIN_SOC_PCT_FIELD_NUMBER: _ClassVar[int]
    ENERGY_MARGIN_WH_FIELD_NUMBER: _ClassVar[int]
    time: _containers.RepeatedCompositeFieldContainer[_timestamp_pb2.Timestamp]
    p_gen_w: _containers.RepeatedScalarFieldContainer[float]
    p_load_w: _containers.RepeatedScalarFieldContainer[float]
    soc_pct: _containers.RepeatedScalarFieldContainer[float]
    survives: bool
    first_brownout_time: _timestamp_pb2.Timestamp
    min_soc_pct: float
    energy_margin_wh: float
    def __init__(self, time: _Optional[_Iterable[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]]] = ..., p_gen_w: _Optional[_Iterable[float]] = ..., p_load_w: _Optional[_Iterable[float]] = ..., soc_pct: _Optional[_Iterable[float]] = ..., survives: _Optional[bool] = ..., first_brownout_time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., min_soc_pct: _Optional[float] = ..., energy_margin_wh: _Optional[float] = ...) -> None: ...
