from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class CheckRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class CheckResponse(_message.Message):
    __slots__ = ()
    class Status(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        STATUS_UNSPECIFIED: _ClassVar[CheckResponse.Status]
        STATUS_OK: _ClassVar[CheckResponse.Status]
        STATUS_DEGRADED: _ClassVar[CheckResponse.Status]
    STATUS_UNSPECIFIED: CheckResponse.Status
    STATUS_OK: CheckResponse.Status
    STATUS_DEGRADED: CheckResponse.Status
    STATUS_FIELD_NUMBER: _ClassVar[int]
    VERSION_FIELD_NUMBER: _ClassVar[int]
    KERNELS_LOADED_FIELD_NUMBER: _ClassVar[int]
    DEM_LAYERS_FIELD_NUMBER: _ClassVar[int]
    status: CheckResponse.Status
    version: str
    kernels_loaded: _containers.RepeatedScalarFieldContainer[str]
    dem_layers: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, status: _Optional[_Union[CheckResponse.Status, str]] = ..., version: _Optional[str] = ..., kernels_loaded: _Optional[_Iterable[str]] = ..., dem_layers: _Optional[_Iterable[str]] = ...) -> None: ...
