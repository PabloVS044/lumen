from buf.validate import validate_pb2 as _validate_pb2
from lumen.v1 import analysis_pb2 as _analysis_pb2
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class ExportFormat(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    EXPORT_FORMAT_UNSPECIFIED: _ClassVar[ExportFormat]
    EXPORT_FORMAT_CSV: _ClassVar[ExportFormat]
    EXPORT_FORMAT_JSON: _ClassVar[ExportFormat]
    EXPORT_FORMAT_PDF: _ClassVar[ExportFormat]
EXPORT_FORMAT_UNSPECIFIED: ExportFormat
EXPORT_FORMAT_CSV: ExportFormat
EXPORT_FORMAT_JSON: ExportFormat
EXPORT_FORMAT_PDF: ExportFormat

class CreateExportRequest(_message.Message):
    __slots__ = ()
    ANALYSIS_FIELD_NUMBER: _ClassVar[int]
    FORMAT_FIELD_NUMBER: _ClassVar[int]
    analysis: _analysis_pb2.AnalyzeRequest
    format: ExportFormat
    def __init__(self, analysis: _Optional[_Union[_analysis_pb2.AnalyzeRequest, _Mapping]] = ..., format: _Optional[_Union[ExportFormat, str]] = ...) -> None: ...

class CreateExportResponse(_message.Message):
    __slots__ = ()
    JOB_ID_FIELD_NUMBER: _ClassVar[int]
    DOWNLOAD_URL_FIELD_NUMBER: _ClassVar[int]
    job_id: str
    download_url: str
    def __init__(self, job_id: _Optional[str] = ..., download_url: _Optional[str] = ...) -> None: ...
