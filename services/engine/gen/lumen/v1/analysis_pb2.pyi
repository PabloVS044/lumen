import datetime

from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf import timestamp_pb2 as _timestamp_pb2
from lumen.v1 import common_pb2 as _common_pb2
from lumen.v1 import ephemeris_pb2 as _ephemeris_pb2
from lumen.v1 import horizon_pb2 as _horizon_pb2
from lumen.v1 import terrain_pb2 as _terrain_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class AnalyzeOptions(_message.Message):
    __slots__ = ()
    HORIZON_FIELD_NUMBER: _ClassVar[int]
    INCLUDE_SERIES_FIELD_NUMBER: _ClassVar[int]
    INCLUDE_MASK_FIELD_NUMBER: _ClassVar[int]
    horizon: _horizon_pb2.HorizonOptions
    include_series: bool
    include_mask: bool
    def __init__(self, horizon: _Optional[_Union[_horizon_pb2.HorizonOptions, _Mapping]] = ..., include_series: _Optional[bool] = ..., include_mask: _Optional[bool] = ...) -> None: ...

class AnalyzeRequest(_message.Message):
    __slots__ = ()
    SITE_FIELD_NUMBER: _ClassVar[int]
    RANGE_FIELD_NUMBER: _ClassVar[int]
    THRESHOLDS_FIELD_NUMBER: _ClassVar[int]
    OPTIONS_FIELD_NUMBER: _ClassVar[int]
    site: _common_pb2.Site
    range: _common_pb2.TimeRange
    thresholds: _common_pb2.Thresholds
    options: AnalyzeOptions
    def __init__(self, site: _Optional[_Union[_common_pb2.Site, _Mapping]] = ..., range: _Optional[_Union[_common_pb2.TimeRange, _Mapping]] = ..., thresholds: _Optional[_Union[_common_pb2.Thresholds, _Mapping]] = ..., options: _Optional[_Union[AnalyzeOptions, _Mapping]] = ...) -> None: ...

class Series(_message.Message):
    __slots__ = ()
    TIME_FIELD_NUMBER: _ClassVar[int]
    SUN_FIELD_NUMBER: _ClassVar[int]
    EARTH_FIELD_NUMBER: _ClassVar[int]
    HORIZON_AT_SUN_DEG_FIELD_NUMBER: _ClassVar[int]
    HORIZON_AT_EARTH_DEG_FIELD_NUMBER: _ClassVar[int]
    ECLIPSE_FRACTION_FIELD_NUMBER: _ClassVar[int]
    SUN_VISIBLE_FIELD_NUMBER: _ClassVar[int]
    EARTH_VISIBLE_FIELD_NUMBER: _ClassVar[int]
    OPERABLE_FIELD_NUMBER: _ClassVar[int]
    time: _containers.RepeatedCompositeFieldContainer[_timestamp_pb2.Timestamp]
    sun: _common_pb2.BodySeries
    earth: _common_pb2.BodySeries
    horizon_at_sun_deg: _containers.RepeatedScalarFieldContainer[float]
    horizon_at_earth_deg: _containers.RepeatedScalarFieldContainer[float]
    eclipse_fraction: _containers.RepeatedScalarFieldContainer[float]
    sun_visible: _containers.RepeatedScalarFieldContainer[bool]
    earth_visible: _containers.RepeatedScalarFieldContainer[bool]
    operable: _containers.RepeatedScalarFieldContainer[bool]
    def __init__(self, time: _Optional[_Iterable[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]]] = ..., sun: _Optional[_Union[_common_pb2.BodySeries, _Mapping]] = ..., earth: _Optional[_Union[_common_pb2.BodySeries, _Mapping]] = ..., horizon_at_sun_deg: _Optional[_Iterable[float]] = ..., horizon_at_earth_deg: _Optional[_Iterable[float]] = ..., eclipse_fraction: _Optional[_Iterable[float]] = ..., sun_visible: _Optional[_Iterable[bool]] = ..., earth_visible: _Optional[_Iterable[bool]] = ..., operable: _Optional[_Iterable[bool]] = ...) -> None: ...

class Metrics(_message.Message):
    __slots__ = ()
    ILLUMINATION_PCT_FIELD_NUMBER: _ClassVar[int]
    ILLUMINATION_PCT_WEIGHTED_FIELD_NUMBER: _ClassVar[int]
    LONGEST_DARK_H_FIELD_NUMBER: _ClassVar[int]
    LONGEST_DARK_INTERVAL_FIELD_NUMBER: _ClassVar[int]
    DARK_PERIODS_COUNT_FIELD_NUMBER: _ClassVar[int]
    EARTH_VISIBLE_PCT_FIELD_NUMBER: _ClassVar[int]
    EARTH_VISIBLE_H_FIELD_NUMBER: _ClassVar[int]
    LONGEST_COMM_WINDOW_H_FIELD_NUMBER: _ClassVar[int]
    LONGEST_COMM_BLACKOUT_H_FIELD_NUMBER: _ClassVar[int]
    OPERABLE_PCT_FIELD_NUMBER: _ClassVar[int]
    LONGEST_OPERABLE_WINDOW_H_FIELD_NUMBER: _ClassVar[int]
    SUN_ELEV_MEAN_VISIBLE_DEG_FIELD_NUMBER: _ClassVar[int]
    SUN_ELEV_MAX_DEG_FIELD_NUMBER: _ClassVar[int]
    SUN_ELEV_MIN_DEG_FIELD_NUMBER: _ClassVar[int]
    EARTH_ELEV_MEAN_DEG_FIELD_NUMBER: _ClassVar[int]
    EARTH_ELEV_MAX_DEG_FIELD_NUMBER: _ClassVar[int]
    EARTH_ELEV_MIN_DEG_FIELD_NUMBER: _ClassVar[int]
    ECLIPSE_HOURS_FIELD_NUMBER: _ClassVar[int]
    FIRST_SUNRISE_AFTER_LANDING_FIELD_NUMBER: _ClassVar[int]
    ENERGY_KWH_PER_M2_FIELD_NUMBER: _ClassVar[int]
    illumination_pct: float
    illumination_pct_weighted: float
    longest_dark_h: float
    longest_dark_interval: _common_pb2.Interval
    dark_periods_count: int
    earth_visible_pct: float
    earth_visible_h: float
    longest_comm_window_h: float
    longest_comm_blackout_h: float
    operable_pct: float
    longest_operable_window_h: float
    sun_elev_mean_visible_deg: float
    sun_elev_max_deg: float
    sun_elev_min_deg: float
    earth_elev_mean_deg: float
    earth_elev_max_deg: float
    earth_elev_min_deg: float
    eclipse_hours: float
    first_sunrise_after_landing: _timestamp_pb2.Timestamp
    energy_kwh_per_m2: float
    def __init__(self, illumination_pct: _Optional[float] = ..., illumination_pct_weighted: _Optional[float] = ..., longest_dark_h: _Optional[float] = ..., longest_dark_interval: _Optional[_Union[_common_pb2.Interval, _Mapping]] = ..., dark_periods_count: _Optional[int] = ..., earth_visible_pct: _Optional[float] = ..., earth_visible_h: _Optional[float] = ..., longest_comm_window_h: _Optional[float] = ..., longest_comm_blackout_h: _Optional[float] = ..., operable_pct: _Optional[float] = ..., longest_operable_window_h: _Optional[float] = ..., sun_elev_mean_visible_deg: _Optional[float] = ..., sun_elev_max_deg: _Optional[float] = ..., sun_elev_min_deg: _Optional[float] = ..., earth_elev_mean_deg: _Optional[float] = ..., earth_elev_max_deg: _Optional[float] = ..., earth_elev_min_deg: _Optional[float] = ..., eclipse_hours: _Optional[float] = ..., first_sunrise_after_landing: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., energy_kwh_per_m2: _Optional[float] = ...) -> None: ...

class Meta(_message.Message):
    __slots__ = ()
    ENGINE_VERSION_FIELD_NUMBER: _ClassVar[int]
    KERNELS_FIELD_NUMBER: _ClassVar[int]
    COMPUTED_AT_FIELD_NUMBER: _ClassVar[int]
    CACHE_HIT_FIELD_NUMBER: _ClassVar[int]
    ELAPSED_MS_FIELD_NUMBER: _ClassVar[int]
    engine_version: str
    kernels: _containers.RepeatedScalarFieldContainer[str]
    computed_at: _timestamp_pb2.Timestamp
    cache_hit: bool
    elapsed_ms: int
    def __init__(self, engine_version: _Optional[str] = ..., kernels: _Optional[_Iterable[str]] = ..., computed_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ..., cache_hit: _Optional[bool] = ..., elapsed_ms: _Optional[int] = ...) -> None: ...

class AnalysisResult(_message.Message):
    __slots__ = ()
    SITE_FIELD_NUMBER: _ClassVar[int]
    COVERAGE_FIELD_NUMBER: _ClassVar[int]
    HORIZON_FIELD_NUMBER: _ClassVar[int]
    SERIES_FIELD_NUMBER: _ClassVar[int]
    METRICS_FIELD_NUMBER: _ClassVar[int]
    EVENTS_FIELD_NUMBER: _ClassVar[int]
    META_FIELD_NUMBER: _ClassVar[int]
    site: _horizon_pb2.Observer
    coverage: _terrain_pb2.Coverage
    horizon: _horizon_pb2.HorizonMask
    series: Series
    metrics: Metrics
    events: _containers.RepeatedCompositeFieldContainer[_ephemeris_pb2.Event]
    meta: Meta
    def __init__(self, site: _Optional[_Union[_horizon_pb2.Observer, _Mapping]] = ..., coverage: _Optional[_Union[_terrain_pb2.Coverage, _Mapping]] = ..., horizon: _Optional[_Union[_horizon_pb2.HorizonMask, _Mapping]] = ..., series: _Optional[_Union[Series, _Mapping]] = ..., metrics: _Optional[_Union[Metrics, _Mapping]] = ..., events: _Optional[_Iterable[_Union[_ephemeris_pb2.Event, _Mapping]]] = ..., meta: _Optional[_Union[Meta, _Mapping]] = ...) -> None: ...

class AnalyzeResponse(_message.Message):
    __slots__ = ()
    RESULT_FIELD_NUMBER: _ClassVar[int]
    JOB_FIELD_NUMBER: _ClassVar[int]
    result: AnalysisResult
    job: _common_pb2.JobRef
    def __init__(self, result: _Optional[_Union[AnalysisResult, _Mapping]] = ..., job: _Optional[_Union[_common_pb2.JobRef, _Mapping]] = ...) -> None: ...

class Scenario(_message.Message):
    __slots__ = ()
    SITE_FIELD_NUMBER: _ClassVar[int]
    RANGE_FIELD_NUMBER: _ClassVar[int]
    site: _common_pb2.Site
    range: _common_pb2.TimeRange
    def __init__(self, site: _Optional[_Union[_common_pb2.Site, _Mapping]] = ..., range: _Optional[_Union[_common_pb2.TimeRange, _Mapping]] = ...) -> None: ...

class CompareRequest(_message.Message):
    __slots__ = ()
    SCENARIOS_FIELD_NUMBER: _ClassVar[int]
    THRESHOLDS_FIELD_NUMBER: _ClassVar[int]
    scenarios: _containers.RepeatedCompositeFieldContainer[Scenario]
    thresholds: _common_pb2.Thresholds
    def __init__(self, scenarios: _Optional[_Iterable[_Union[Scenario, _Mapping]]] = ..., thresholds: _Optional[_Union[_common_pb2.Thresholds, _Mapping]] = ...) -> None: ...

class CompareResponse(_message.Message):
    __slots__ = ()
    class BestByMetricEntry(_message.Message):
        __slots__ = ()
        KEY_FIELD_NUMBER: _ClassVar[int]
        VALUE_FIELD_NUMBER: _ClassVar[int]
        key: str
        value: int
        def __init__(self, key: _Optional[str] = ..., value: _Optional[int] = ...) -> None: ...
    RESULTS_FIELD_NUMBER: _ClassVar[int]
    BEST_BY_METRIC_FIELD_NUMBER: _ClassVar[int]
    results: _containers.RepeatedCompositeFieldContainer[AnalysisResult]
    best_by_metric: _containers.ScalarMap[str, int]
    def __init__(self, results: _Optional[_Iterable[_Union[AnalysisResult, _Mapping]]] = ..., best_by_metric: _Optional[_Mapping[str, int]] = ...) -> None: ...
