import numpy as np

from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.visibility.compute import Visibility


def test_window_slices_every_series_consistently() -> None:
    n = 10
    utc = np.datetime64("2027-01-01T00:00:00", "s") + np.arange(n) * np.timedelta64(1800, "s")
    grid = TimeGrid(utc=utc, et=np.arange(n, dtype=np.float64), step_minutes=30).window(2, 6)
    assert len(grid) == 4 and grid.step_minutes == 30
    assert grid.utc[0] == np.datetime64("2027-01-01T01:00:00")

    body = BodyEphemeris(np.arange(n, dtype=float), np.arange(n, dtype=float), np.ones(n))
    assert body.window(2, 6).az_deg.tolist() == [2, 3, 4, 5]

    flags = np.arange(n) % 2 == 0
    x = np.arange(n, dtype=np.float64)
    vis = Visibility(
        horizon_at_sun=x,
        horizon_at_earth=x,
        sun_fraction=x,
        earth_fraction=x,
        eclipse_fraction=x,
        sun_visible=flags,
        earth_visible=flags,
        operable=flags,
    ).window(2, 6)
    assert vis.sun_fraction.tolist() == [2, 3, 4, 5]
    assert vis.operable.tolist() == [True, False, True, False]
