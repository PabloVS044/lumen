from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from google.protobuf.timestamp_pb2 import Timestamp
from hypothesis import given, settings
from hypothesis import strategies as st
from lumen.v1 import common_pb2

from lumen_engine.core.errors import EngineError, OutOfEphemerisRangeError

pytestmark = pytest.mark.requires_kernels


def _range(start: datetime, end: datetime, step: int = 0) -> common_pb2.TimeRange:
    s, e = Timestamp(), Timestamp()
    s.FromDatetime(start)
    e.FromDatetime(end)
    return common_pb2.TimeRange(start=s, end=e, step_minutes=step)


T0 = datetime(2027, 1, 1, tzinfo=UTC)


def test_default_step_is_30_minutes_and_end_inclusive() -> None:
    from lumen_engine.ephem.timegrid import build_grid

    grid = build_grid(_range(T0, T0 + timedelta(hours=2)))
    assert grid.step_minutes == 30
    assert len(grid) == 5
    assert grid.utc[0] == np.datetime64("2027-01-01T00:00:00")
    assert grid.utc[-1] == np.datetime64("2027-01-01T02:00:00")
    assert grid.datetimes()[1] == T0 + timedelta(minutes=30)


@settings(max_examples=40, deadline=None)
@given(
    offset_h=st.integers(min_value=0, max_value=24 * 365),
    hours=st.integers(min_value=1, max_value=24 * 30),
    step=st.integers(min_value=5, max_value=360),
)
def test_grid_is_uniform_in_et_and_within_range(offset_h: int, hours: int, step: int) -> None:
    from lumen_engine.ephem.timegrid import build_grid

    start = T0 + timedelta(hours=offset_h)
    end = start + timedelta(hours=hours)
    grid = build_grid(_range(start, end, step))
    assert len(grid) == len(grid.et) == int(hours * 60 // step) + 1
    assert grid.utc[-1] <= np.datetime64(end.replace(tzinfo=None))
    # Sin segundos intercalares programados en 2027-2028: paso constante en ET
    assert np.allclose(np.diff(grid.et), step * 60.0, atol=1e-3)


def test_range_longer_than_limit_is_rejected() -> None:
    from lumen_engine.ephem.timegrid import build_grid

    with pytest.raises(EngineError) as exc:
        build_grid(_range(T0, T0 + timedelta(days=800), 360))
    assert exc.value.code == "RANGE_TOO_LONG"


def test_too_many_samples_is_rejected() -> None:
    from lumen_engine.ephem.timegrid import build_grid

    with pytest.raises(EngineError) as exc:
        build_grid(_range(T0, T0 + timedelta(days=400), 5))
    assert exc.value.code == "TOO_MANY_SAMPLES"


def test_range_outside_kernels_is_rejected() -> None:
    from lumen_engine.ephem.timegrid import build_grid

    start = datetime(2150, 6, 1, tzinfo=UTC)
    with pytest.raises(OutOfEphemerisRangeError):
        build_grid(_range(start, start + timedelta(days=1), 60))
