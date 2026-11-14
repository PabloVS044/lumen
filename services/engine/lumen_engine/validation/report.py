"""Reporte público de validación (HU-13, sección 14). Owner: R3 Efemérides/Ciencia.

`report.json` se genera con `uv run python -m tests.validation.tools.build_report` a partir de las
mismas comparaciones que ejecutan los tests; un test exige que esté al día.
"""

import json
from functools import lru_cache
from pathlib import Path

from lumen.v1 import validation_pb2

REPORT_PATH = Path(__file__).with_name("report.json")


@lru_cache(maxsize=1)
def load_report() -> validation_pb2.GetReportResponse:
    data = json.loads(REPORT_PATH.read_text(encoding="utf-8"))
    return validation_pb2.GetReportResponse(
        checks=[validation_pb2.ValidationCheck(**check) for check in data["checks"]]
    )
