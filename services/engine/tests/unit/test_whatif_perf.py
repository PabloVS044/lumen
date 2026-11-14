import time
from datetime import UTC, datetime

import pytest
from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2, power_pb2, whatif_pb2

from lumen_engine.metrics.whatif import evaluate_request


@pytest.mark.requires_kernels
@pytest.mark.slow
@pytest.mark.usefixtures("flat_horizon")
def test_sixty_day_whatif_runs_under_three_seconds() -> None:
    """Sección 14.4: what-if de 60 días con paso de 24 h, misión de 14 días y batería, < 3 s."""
    t = Timestamp()
    t.FromDatetime(datetime(2027, 1, 1, tzinfo=UTC))
    req = whatif_pb2.EvaluateRequest(
        site=common_pb2.Site(lat=-89.45, lon=-137.31),
        nominal_landing=t,
        max_delay_days=60,
        mission_duration_days=14,
        power=power_pb2.PowerConfig(),
    )
    t0 = time.perf_counter()
    res = evaluate_request(req)
    elapsed = time.perf_counter() - t0
    assert len(res.points) == 61
    assert elapsed < 3.0, f"{elapsed:.2f} s"
