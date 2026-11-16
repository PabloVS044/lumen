"""AnalysisResult -> bytes. Puro: sin I/O ni estado."""

import csv
import io
import json

from google.protobuf.json_format import MessageToDict
from lumen.v1 import analysis_pb2

CSV_COLUMNS = (
    "time",
    "sun_az_deg",
    "sun_el_deg",
    "sun_fraction",
    "earth_az_deg",
    "earth_el_deg",
    "earth_fraction",
    "horizon_at_sun_deg",
    "horizon_at_earth_deg",
    "eclipse_fraction",
    "sun_visible",
    "earth_visible",
    "operable",
)


def to_csv(result: analysis_pb2.AnalysisResult) -> bytes:
    s = result.series
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(CSV_COLUMNS)
    for i, t in enumerate(s.time):
        w.writerow(
            [
                t.ToDatetime().strftime("%Y-%m-%dT%H:%M:%S") + "Z",
                repr(s.sun.az_deg[i]),
                repr(s.sun.el_deg[i]),
                repr(s.sun.fraction[i]),
                repr(s.earth.az_deg[i]),
                repr(s.earth.el_deg[i]),
                repr(s.earth.fraction[i]),
                repr(s.horizon_at_sun_deg[i]),
                repr(s.horizon_at_earth_deg[i]),
                repr(s.eclipse_fraction[i]),
                str(s.sun_visible[i]).lower(),
                str(s.earth_visible[i]).lower(),
                str(s.operable[i]).lower(),
            ]
        )
    return buf.getvalue().encode()


def to_json(result: analysis_pb2.AnalysisResult) -> bytes:
    full = MessageToDict(result)
    doc = {
        k: full[k] for k in ("site", "coverage", "metrics", "events", "meta", "series") if k in full
    }
    return json.dumps(doc, separators=(",", ":")).encode()
