from buf.validate import validate_pb2 as _validate_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class SiteStatus(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    SITE_STATUS_UNSPECIFIED: _ClassVar[SiteStatus]
    SITE_STATUS_CANDIDATE: _ClassVar[SiteStatus]
    SITE_STATUS_LANDED: _ClassVar[SiteStatus]
    SITE_STATUS_PLANNED: _ClassVar[SiteStatus]
    SITE_STATUS_HISTORIC: _ClassVar[SiteStatus]

class Region(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    REGION_UNSPECIFIED: _ClassVar[Region]
    REGION_SOUTH_POLE: _ClassVar[Region]
    REGION_NORTH_POLE: _ClassVar[Region]
    REGION_NEARSIDE: _ClassVar[Region]
    REGION_FARSIDE: _ClassVar[Region]
SITE_STATUS_UNSPECIFIED: SiteStatus
SITE_STATUS_CANDIDATE: SiteStatus
SITE_STATUS_LANDED: SiteStatus
SITE_STATUS_PLANNED: SiteStatus
SITE_STATUS_HISTORIC: SiteStatus
REGION_UNSPECIFIED: Region
REGION_SOUTH_POLE: Region
REGION_NORTH_POLE: Region
REGION_NEARSIDE: Region
REGION_FARSIDE: Region

class CatalogSite(_message.Message):
    __slots__ = ()
    ID_FIELD_NUMBER: _ClassVar[int]
    NAME_FIELD_NUMBER: _ClassVar[int]
    LAT_FIELD_NUMBER: _ClassVar[int]
    LON_FIELD_NUMBER: _ClassVar[int]
    PROGRAM_FIELD_NUMBER: _ClassVar[int]
    AGENCY_FIELD_NUMBER: _ClassVar[int]
    COUNTRY_FIELD_NUMBER: _ClassVar[int]
    STATUS_FIELD_NUMBER: _ClassVar[int]
    REGION_FIELD_NUMBER: _ClassVar[int]
    COORD_PRECISION_FIELD_NUMBER: _ClassVar[int]
    VERIFIED_FIELD_NUMBER: _ClassVar[int]
    SOURCE_URL_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_ES_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_EN_FIELD_NUMBER: _ClassVar[int]
    id: str
    name: str
    lat: float
    lon: float
    program: str
    agency: str
    country: str
    status: SiteStatus
    region: Region
    coord_precision: str
    verified: bool
    source_url: str
    description_es: str
    description_en: str
    def __init__(self, id: _Optional[str] = ..., name: _Optional[str] = ..., lat: _Optional[float] = ..., lon: _Optional[float] = ..., program: _Optional[str] = ..., agency: _Optional[str] = ..., country: _Optional[str] = ..., status: _Optional[_Union[SiteStatus, str]] = ..., region: _Optional[_Union[Region, str]] = ..., coord_precision: _Optional[str] = ..., verified: _Optional[bool] = ..., source_url: _Optional[str] = ..., description_es: _Optional[str] = ..., description_en: _Optional[str] = ...) -> None: ...

class ListSitesRequest(_message.Message):
    __slots__ = ()
    PROGRAM_FIELD_NUMBER: _ClassVar[int]
    COUNTRY_FIELD_NUMBER: _ClassVar[int]
    REGION_FIELD_NUMBER: _ClassVar[int]
    QUERY_FIELD_NUMBER: _ClassVar[int]
    program: str
    country: str
    region: Region
    query: str
    def __init__(self, program: _Optional[str] = ..., country: _Optional[str] = ..., region: _Optional[_Union[Region, str]] = ..., query: _Optional[str] = ...) -> None: ...

class ListSitesResponse(_message.Message):
    __slots__ = ()
    SITES_FIELD_NUMBER: _ClassVar[int]
    sites: _containers.RepeatedCompositeFieldContainer[CatalogSite]
    def __init__(self, sites: _Optional[_Iterable[_Union[CatalogSite, _Mapping]]] = ...) -> None: ...

class GetSiteRequest(_message.Message):
    __slots__ = ()
    ID_FIELD_NUMBER: _ClassVar[int]
    id: str
    def __init__(self, id: _Optional[str] = ...) -> None: ...

class GetSiteResponse(_message.Message):
    __slots__ = ()
    SITE_FIELD_NUMBER: _ClassVar[int]
    site: CatalogSite
    def __init__(self, site: _Optional[_Union[CatalogSite, _Mapping]] = ...) -> None: ...
