from buf.validate import validate_pb2 as _validate_pb2
from lumen.v1 import common_pb2 as _common_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class Coverage(_message.Message):
    __slots__ = ()
    LAYERS_FIELD_NUMBER: _ClassVar[int]
    NEAR_RES_M_FIELD_NUMBER: _ClassVar[int]
    INTERPOLATED_FRACTION_FIELD_NUMBER: _ClassVar[int]
    WARNINGS_FIELD_NUMBER: _ClassVar[int]
    layers: _containers.RepeatedScalarFieldContainer[str]
    near_res_m: float
    interpolated_fraction: float
    warnings: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, layers: _Optional[_Iterable[str]] = ..., near_res_m: _Optional[float] = ..., interpolated_fraction: _Optional[float] = ..., warnings: _Optional[_Iterable[str]] = ...) -> None: ...

class GetCoverageRequest(_message.Message):
    __slots__ = ()
    POINT_FIELD_NUMBER: _ClassVar[int]
    point: _common_pb2.LatLon
    def __init__(self, point: _Optional[_Union[_common_pb2.LatLon, _Mapping]] = ...) -> None: ...

class GetCoverageResponse(_message.Message):
    __slots__ = ()
    COVERAGE_FIELD_NUMBER: _ClassVar[int]
    coverage: Coverage
    def __init__(self, coverage: _Optional[_Union[Coverage, _Mapping]] = ...) -> None: ...

class GetTerrainPointRequest(_message.Message):
    __slots__ = ()
    POINT_FIELD_NUMBER: _ClassVar[int]
    point: _common_pb2.LatLon
    def __init__(self, point: _Optional[_Union[_common_pb2.LatLon, _Mapping]] = ...) -> None: ...

class GetTerrainPointResponse(_message.Message):
    __slots__ = ()
    HEIGHT_M_FIELD_NUMBER: _ClassVar[int]
    SLOPE_DEG_FIELD_NUMBER: _ClassVar[int]
    height_m: float
    slope_deg: float
    def __init__(self, height_m: _Optional[float] = ..., slope_deg: _Optional[float] = ...) -> None: ...
