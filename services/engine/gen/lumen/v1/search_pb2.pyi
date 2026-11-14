from buf.validate import validate_pb2 as _validate_pb2
from lumen.v1 import common_pb2 as _common_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class FindBestSpotRequest(_message.Message):
    __slots__ = ()
    class WeightsEntry(_message.Message):
        __slots__ = ()
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: float
        def __init__(self, key: _Optional[str] = ..., value: _Optional[float] = ...) -> None: ...
    CENTER_FIELD_NUMBER: _ClassVar[int]
    RADIUS_KM_FIELD_NUMBER: _ClassVar[int]
    SPACING_M_FIELD_NUMBER: _ClassVar[int]
    MAX_SLOPE_DEG_FIELD_NUMBER: _ClassVar[int]
    RANGE_FIELD_NUMBER: _ClassVar[int]
    OBJECTIVE_FIELD_NUMBER: _ClassVar[int]
    WEIGHTS_FIELD_NUMBER: _ClassVar[int]
    TOP_K_FIELD_NUMBER: _ClassVar[int]
    center: _common_pb2.LatLon
    radius_km: float
    spacing_m: float
    max_slope_deg: float
    range: _common_pb2.TimeRange
    objective: str
    weights: _containers.ScalarMap[str, float]
    top_k: int
    def __init__(self, center: _Optional[_Union[_common_pb2.LatLon, _Mapping]] = ..., radius_km: _Optional[float] = ..., spacing_m: _Optional[float] = ..., max_slope_deg: _Optional[float] = ..., range: _Optional[_Union[_common_pb2.TimeRange, _Mapping]] = ..., objective: _Optional[str] = ..., weights: _Optional[_Mapping[str, float]] = ..., top_k: _Optional[int] = ...) -> None: ...

class FindBestSpotResponse(_message.Message):
    __slots__ = ()
    JOB_FIELD_NUMBER: _ClassVar[int]
    job: _common_pb2.JobRef
    def __init__(self, job: _Optional[_Union[_common_pb2.JobRef, _Mapping]] = ...) -> None: ...

class GetBestSpotResultRequest(_message.Message):
    __slots__ = ()
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    job_id: str
    def __init__(self, job_id: _Optional[str] = ...) -> None: ...

class SpotCandidate(_message.Message):
    __slots__ = ()
    class MetricsEntry(_message.Message):
        __slots__ = ()
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: float
        def __init__(self, key: _Optional[str] = ..., value: _Optional[float] = ...) -> None: ...
    POINT_FIELD_NUMBER: _ClassVar[int]
    SCORE_FIELD_NUMBER: _ClassVar[int]
    METRICS_FIELD_NUMBER: _ClassVar[int]
    point: _common_pb2.LatLon
    score: float
    metrics: _containers.ScalarMap[str, float]
    def __init__(self, point: _Optional[_Union[_common_pb2.LatLon, _Mapping]] = ..., score: _Optional[float] = ..., metrics: _Optional[_Mapping[str, float]] = ...) -> None: ...

class GetBestSpotResultResponse(_message.Message):
    __slots__ = ()
    TOP_FIELD_NUMBER: _ClassVar[int]
    GRID_COLS_FIELD_NUMBER: _ClassVar[int]
    GRID_ROWS_FIELD_NUMBER: _ClassVar[int]
    GRID_VALUES_FIELD_NUMBER: _ClassVar[int]
    top: _containers.RepeatedCompositeFieldContainer[SpotCandidate]
    grid_cols: int
    grid_rows: int
    grid_values: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, top: _Optional[_Iterable[_Union[SpotCandidate, _Mapping]]] = ..., grid_cols: _Optional[int] = ..., grid_rows: _Optional[int] = ..., grid_values: _Optional[_Iterable[float]] = ...) -> None: ...
