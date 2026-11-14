import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Site(_message.Message):
    __slots__ = ()
    LAT_FIELD_NUMBER: _ClassVar[int]
    LON_FIELD_NUMBER: _ClassVar[int]
    OBS_HEIGHT_M_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    CATALOG_ID_FIELD_NUMBER: _ClassVar[int]
    lat: float
    lon: float
    obs_height_m: float
    name: str
    catalog_id: str
    def __init__(self, lat: _Optional[float] = ..., lon: _Optional[float] = ..., obs_height_m: _Optional[float] = ..., name: _Optional[str] = ..., catalog_id: _Optional[str] = ...) -> None: ...

class LatLon(_message.Message):
    __slots__ = ()
    LAT_FIELD_NUMBER: _ClassVar[int]
    LON_FIELD_NUMBER: _ClassVar[int]
    lat: float
    lon: float
    def __init__(self, lat: _Optional[float] = ..., lon: _Optional[float] = ...) -> None: ...

class TimeRange(_message.Message):
    __slots__ = ()
    START_FIELD_NUMBER: _ClassVar[int]
    END_FIELD_NUMBER: _ClassVar[int]
    STEP_MINUTES_FIELD_NUMBER: _ClassVar[int]
    start: _timestamp_pb2.Timestamp
    end: _timestamp_pb2.Timestamp
    step_minutes: int
    def __init__(self, start: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., end: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., step_minutes: _Optional[int] = ...) -> None: ...

class Thresholds(_message.Message):
    __slots__ = ()
    SUN_MIN_FRACTION_FIELD_NUMBER: _ClassVar[int]
    EARTH_MARGIN_DEG_FIELD_NUMBER: _ClassVar[int]
    sun_min_fraction: float
    earth_margin_deg: float
    def __init__(self, sun_min_fraction: _Optional[float] = ..., earth_margin_deg: _Optional[float] = ...) -> None: ...

class BodySeries(_message.Message):
    __slots__ = ()
    AZ_DEG_FIELD_NUMBER: _ClassVar[int]
    EL_DEG_FIELD_NUMBER: _ClassVar[int]
    FRACTION_FIELD_NUMBER: _ClassVar[int]
    DIST_KM_FIELD_NUMBER: _ClassVar[int]
    az_deg: _containers.RepeatedScalarFieldContainer[float]
    el_deg: _containers.RepeatedScalarFieldContainer[float]
    fraction: _containers.RepeatedScalarFieldContainer[float]
    dist_km: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, az_deg: _Optional[_Iterable[float]] = ..., el_deg: _Optional[_Iterable[float]] = ..., fraction: _Optional[_Iterable[float]] = ..., dist_km: _Optional[_Iterable[float]] = ...) -> None: ...

class Interval(_message.Message):
    __slots__ = ()
    START_FIELD_NUMBER: _ClassVar[int]
    END_FIELD_NUMBER: _ClassVar[int]
    TRUNCATED_FIELD_NUMBER: _ClassVar[int]
    start: _timestamp_pb2.Timestamp
    end: _timestamp_pb2.Timestamp
    truncated: bool
    def __init__(self, start: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., end: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., truncated: _Optional[bool] = ...) -> None: ...

class JobRef(_message.Message):
    __slots__ = ()
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    job_id: str
    def __init__(self, job_id: _Optional[str] = ...) -> None: ...

class ErrorDetail(_message.Message):
    __slots__ = ()
    class ContextEntry(_message.Message):
        __slots__ = ()
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: str
        def __init__(self, key: _Optional[str] = ..., value: _Optional[str] = ...) -> None: ...
    CODE_FIELD_NUMBER: _ClassVar[int]
    CONTEXT_FIELD_NUMBER: _ClassVar[int]
    code: str
    context: _containers.ScalarMap[str, str]
    def __init__(self, code: _Optional[str] = ..., context: _Optional[_Mapping[str, str]] = ...) -> None: ...
