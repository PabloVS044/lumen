import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from lumen.v1 import common_pb2 as _common_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class EventType(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    EVENT_TYPE_UNSPECIFIED: _ClassVar[EventType]
    EVENT_TYPE_SUNRISE: _ClassVar[EventType]
    EVENT_TYPE_SUNSET: _ClassVar[EventType]
    EVENT_TYPE_EARTHRISE: _ClassVar[EventType]
    EVENT_TYPE_EARTHSET: _ClassVar[EventType]
    EVENT_TYPE_ECLIPSE_START: _ClassVar[EventType]
    EVENT_TYPE_ECLIPSE_END: _ClassVar[EventType]
EVENT_TYPE_UNSPECIFIED: EventType
EVENT_TYPE_SUNRISE: EventType
EVENT_TYPE_SUNSET: EventType
EVENT_TYPE_EARTHRISE: EventType
EVENT_TYPE_EARTHSET: EventType
EVENT_TYPE_ECLIPSE_START: EventType
EVENT_TYPE_ECLIPSE_END: EventType

class Event(_message.Message):
    __slots__ = ()
    TYPE_FIELD_NUMBER: _ClassVar[int]
    TIME_FIELD_NUMBER: _ClassVar[int]
    type: EventType
    time: _timestamp_pb2.Timestamp
    def __init__(self, type: _Optional[_Union[EventType, str]] = ..., time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class Vector3(_message.Message):
    __slots__ = ()
    X_FIELD_NUMBER: _ClassVar[int]
    Y_FIELD_NUMBER: _ClassVar[int]
    Z_FIELD_NUMBER: _ClassVar[int]
    x: float
    y: float
    z: float
    def __init__(self, x: _Optional[float] = ..., y: _Optional[float] = ..., z: _Optional[float] = ...) -> None: ...

class GetSeriesRequest(_message.Message):
    __slots__ = ()
    SITE_FIELD_NUMBER: _ClassVar[int]
    RANGE_FIELD_NUMBER: _ClassVar[int]
    site: _common_pb2.Site
    range: _common_pb2.TimeRange
    def __init__(self, site: _Optional[_Union[_common_pb2.Site, _Mapping]] = ..., range: _Optional[_Union[_common_pb2.TimeRange, _Mapping]] = ...) -> None: ...

class GetSeriesResponse(_message.Message):
    __slots__ = ()
    TIME_FIELD_NUMBER: _ClassVar[int]
    SUN_FIELD_NUMBER: _ClassVar[int]
    EARTH_FIELD_NUMBER: _ClassVar[int]
    time: _containers.RepeatedCompositeFieldContainer[_timestamp_pb2.Timestamp]
    sun: _common_pb2.BodySeries
    earth: _common_pb2.BodySeries
    def __init__(self, time: _Optional[_Iterable[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]]] = ..., sun: _Optional[_Union[_common_pb2.BodySeries, _Mapping]] = ..., earth: _Optional[_Union[_common_pb2.BodySeries, _Mapping]] = ...) -> None: ...

class GetStateRequest(_message.Message):
    __slots__ = ()
    TIME_FIELD_NUMBER: _ClassVar[int]
    time: _timestamp_pb2.Timestamp
    def __init__(self, time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...) -> None: ...

class GetStateResponse(_message.Message):
    __slots__ = ()
    TIME_FIELD_NUMBER: _ClassVar[int]
    SUN_DIR_FIELD_NUMBER: _ClassVar[int]
    EARTH_DIR_FIELD_NUMBER: _ClassVar[int]
    time: _timestamp_pb2.Timestamp
    sun_dir: Vector3
    earth_dir: Vector3
    def __init__(self, time: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., sun_dir: _Optional[_Union[Vector3, _Mapping]] = ..., earth_dir: _Optional[_Union[Vector3, _Mapping]] = ...) -> None: ...

class ListEventsRequest(_message.Message):
    __slots__ = ()
    SITE_FIELD_NUMBER: _ClassVar[int]
    FROM_FIELD_NUMBER: _ClassVar[int]
    TYPES_FIELD_NUMBER: _ClassVar[int]
    HORIZON_DAYS_FIELD_NUMBER: _ClassVar[int]
    site: _common_pb2.Site
    types: _containers.RepeatedScalarFieldContainer[EventType]
    horizon_days: int
    def __init__(self, site: _Optional[_Union[_common_pb2.Site, _Mapping]] = ..., types: _Optional[_Iterable[_Union[EventType, str]]] = ..., horizon_days: _Optional[int] = ..., **kwargs) -> None: ...

class ListEventsResponse(_message.Message):
    __slots__ = ()
    EVENTS_FIELD_NUMBER: _ClassVar[int]
    events: _containers.RepeatedCompositeFieldContainer[Event]
    def __init__(self, events: _Optional[_Iterable[_Union[Event, _Mapping]]] = ...) -> None: ...
