from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class GetReportRequest(_message.Message):
    __slots__ = ()
    def __init__(self) -> None: ...

class ValidationCheck(_message.Message):
    __slots__ = ()
    ID_FIELD_NUMBER: _ClassVar[int]
    DESCRIPTION_FIELD_NUMBER: _ClassVar[int]
    TOLERANCE_FIELD_NUMBER: _ClassVar[int]
    MAX_ERROR_FIELD_NUMBER: _ClassVar[int]
    PASSED_FIELD_NUMBER: _ClassVar[int]
    NOTES_FIELD_NUMBER: _ClassVar[int]
    id: str
    description: str
    tolerance: float
    max_error: float
    passed: bool
    notes: str
    def __init__(self, id: _Optional[str] = ..., description: _Optional[str] = ..., tolerance: _Optional[float] = ..., max_error: _Optional[float] = ..., passed: _Optional[bool] = ..., notes: _Optional[str] = ...) -> None: ...

class GetReportResponse(_message.Message):
    __slots__ = ()
    CHECKS_FIELD_NUMBER: _ClassVar[int]
    checks: _containers.RepeatedCompositeFieldContainer[ValidationCheck]
    def __init__(self, checks: _Optional[_Iterable[_Union[ValidationCheck, _Mapping]]] = ...) -> None: ...
