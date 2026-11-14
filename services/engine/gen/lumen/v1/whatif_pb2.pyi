import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from lumen.v1 import common_pb2 as _common_pb2
from lumen.v1 import power_pb2 as _power_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class EvaluateRequest(_message.Message):
    __slots__ = ()
    SITE_FIELD_NUMBER: _ClassVar[int]
    NOMINAL_LANDING_FIELD_NUMBER: _ClassVar[int]
    MAX_DELAY_DAYS_FIELD_NUMBER: _ClassVar[int]
    DELAY_STEP_HOURS_FIELD_NUMBER: _ClassVar[int]
    MISSION_DURATION_DAYS_FIELD_NUMBER: _ClassVar[int]
    METRICS_FIELD_NUMBER: _ClassVar[int]
    POWER_FIELD_NUMBER: _ClassVar[int]
    site: _common_pb2.Site
    nominal_landing: _timestamp_pb2.Timestamp
    max_delay_days: int
    delay_step_hours: int
    mission_duration_days: float
    metrics: _containers.RepeatedScalarFieldContainer[str]
    power: _power_pb2.PowerConfig
    def __init__(self, site: _Optional[_Union[_common_pb2.Site, _Mapping]] = ..., nominal_landing: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., max_delay_days: _Optional[int] = ..., delay_step_hours: _Optional[int] = ..., mission_duration_days: _Optional[float] = ..., metrics: _Optional[_Iterable[str]] = ..., power: _Optional[_Union[_power_pb2.PowerConfig, _Mapping]] = ...) -> None: ...

class WhatIfPoint(_message.Message):
    __slots__ = ()
    class MetricsEntry(_message.Message):
        __slots__ = ()
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: float
        def __init__(self, key: _Optional[str] = ..., value: _Optional[float] = ...) -> None: ...
    DELAY_HOURS_FIELD_NUMBER: _ClassVar[int]
    LANDING_FIELD_NUMBER: _ClassVar[int]
    METRICS_FIELD_NUMBER: _ClassVar[int]
    SURVIVES_FIELD_NUMBER: _ClassVar[int]
    delay_hours: float
    landing: _timestamp_pb2.Timestamp
    metrics: _containers.ScalarMap[str, float]
    survives: bool
    def __init__(self, delay_hours: _Optional[float] = ..., landing: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., metrics: _Optional[_Mapping[str, float]] = ..., survives: _Optional[bool] = ...) -> None: ...

class EvaluateResponse(_message.Message):
    __slots__ = ()
    POINTS_FIELD_NUMBER: _ClassVar[int]
    RECOMMENDED_DELAYS_HOURS_FIELD_NUMBER: _ClassVar[int]
    points: _containers.RepeatedCompositeFieldContainer[WhatIfPoint]
    recommended_delays_hours: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, points: _Optional[_Iterable[_Union[WhatIfPoint, _Mapping]]] = ..., recommended_delays_hours: _Optional[_Iterable[float]] = ...) -> None: ...
