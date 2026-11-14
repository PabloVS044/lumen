from buf.validate import validate_pb2 as _validate_pb2
from lumen.v1 import common_pb2 as _common_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class HorizonOptions(_message.Message):
    __slots__ = ()
    AZ_STEP_DEG_FIELD_NUMBER: _ClassVar[int]
    MAX_RANGE_KM_FIELD_NUMBER: _ClassVar[int]
    az_step_deg: float
    max_range_km: float
    def __init__(self, az_step_deg: _Optional[float] = ..., max_range_km: _Optional[float] = ...) -> None: ...

class Observer(_message.Message):
    __slots__ = ()
    LAT_FIELD_NUMBER: _ClassVar[int]
    LON_FIELD_NUMBER: _ClassVar[int]
    TERRAIN_HEIGHT_M_FIELD_NUMBER: _ClassVar[int]
    OBS_HEIGHT_M_FIELD_NUMBER: _ClassVar[int]
    lat: float
    lon: float
    terrain_height_m: float
    obs_height_m: float
    def __init__(self, lat: _Optional[float] = ..., lon: _Optional[float] = ..., terrain_height_m: _Optional[float] = ..., obs_height_m: _Optional[float] = ...) -> None: ...

class HorizonMask(_message.Message):
    __slots__ = ()
    AZ_STEP_DEG_FIELD_NUMBER: _ClassVar[int]
    ELEVATION_DEG_FIELD_NUMBER: _ClassVar[int]
    OBSTACLE_DISTANCE_M_FIELD_NUMBER: _ClassVar[int]
    OBSERVER_FIELD_NUMBER: _ClassVar[int]
    LAYERS_USED_FIELD_NUMBER: _ClassVar[int]
    MAX_RANGE_KM_FIELD_NUMBER: _ClassVar[int]
    az_step_deg: float
    elevation_deg: _containers.RepeatedScalarFieldContainer[float]
    obstacle_distance_m: _containers.RepeatedScalarFieldContainer[float]
    observer: Observer
    layers_used: _containers.RepeatedScalarFieldContainer[str]
    max_range_km: float
    def __init__(self, az_step_deg: _Optional[float] = ..., elevation_deg: _Optional[_Iterable[float]] = ..., obstacle_distance_m: _Optional[_Iterable[float]] = ..., observer: _Optional[_Union[Observer, _Mapping]] = ..., layers_used: _Optional[_Iterable[str]] = ..., max_range_km: _Optional[float] = ...) -> None: ...

class ComputeHorizonRequest(_message.Message):
    __slots__ = ()
    SITE_FIELD_NUMBER: _ClassVar[int]
    OPTIONS_FIELD_NUMBER: _ClassVar[int]
    site: _common_pb2.Site
    options: HorizonOptions
    def __init__(self, site: _Optional[_Union[_common_pb2.Site, _Mapping]] = ..., options: _Optional[_Union[HorizonOptions, _Mapping]] = ...) -> None: ...

class ComputeHorizonResponse(_message.Message):
    __slots__ = ()
    MASK_FIELD_NUMBER: _ClassVar[int]
    JOB_FIELD_NUMBER: _ClassVar[int]
    mask: HorizonMask
    job: _common_pb2.JobRef
    def __init__(self, mask: _Optional[_Union[HorizonMask, _Mapping]] = ..., job: _Optional[_Union[_common_pb2.JobRef, _Mapping]] = ...) -> None: ...
