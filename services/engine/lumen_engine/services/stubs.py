"""Servicios aún sin lógica: heredan el stub generado (responden UNIMPLEMENTED).
Al implementar uno, muévelo a su propio archivo (services/<area>.py) en el PR de su owner."""

from lumen.v1.export_connect import ExportService
from lumen.v1.jobs_connect import JobService
from lumen.v1.search_connect import SearchService
from lumen.v1.validation_connect import ValidationService


class JobServiceImpl(JobService):  # R1
    pass


class SearchServiceImpl(SearchService):  # R2
    pass


class ExportServiceImpl(ExportService):  # R1
    pass


class ValidationServiceImpl(ValidationService):  # R3
    pass
