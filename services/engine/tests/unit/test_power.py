from datetime import UTC, datetime, timedelta

import numpy as np
import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from lumen.v1 import power_pb2

from lumen_engine.core.constants import AU_KM, SOLAR_CONSTANT_W_M2
from lumen_engine.core.errors import EngineError
from lumen_engine.ephem.spice import BodyEphemeris
from lumen_engine.ephem.timegrid import TimeGrid
from lumen_engine.power.simulator import PowerParams, simulate

T0 = datetime(2027, 1, 1, tzinfo=UTC)
P = power_pb2


def _grid(n: int) -> TimeGrid:
    utc = np.datetime64("2027-01-01T00:00:00", "s") + np.arange(n) * np.timedelta64(3600, "s")
    return TimeGrid(utc=utc, et=np.arange(n, dtype=np.float64) * 3600.0, step_minutes=60)


def _sun(n: int, el: float = 0.0, az: float = 90.0) -> BodyEphemeris:
    return BodyEphemeris(az_deg=np.full(n, az), el_deg=np.full(n, el), dist_km=np.full(n, AU_KM))


def test_defaults_match_section_9_8_small_lander() -> None:
    p = PowerParams.from_proto(P.PowerConfig())
    assert (p.panel_area_m2, p.efficiency, p.battery_wh) == (2.0, 0.28, 2000.0)
    assert (p.soc0_pct, p.max_dod_pct, p.load_day_w, p.load_night_w) == (100.0, 80.0, 150.0, 60.0)
    assert p.battery_efficiency == 0.95
    assert p.orientation == P.PANEL_ORIENTATION_VERTICAL_TRACKING


def test_explicit_zero_load_is_respected() -> None:
    p = PowerParams.from_proto(P.PowerConfig(load_night_w=0.0))
    assert p.load_night_w == 0.0


def test_vertical_fixed_requires_azimuth() -> None:
    with pytest.raises(EngineError) as exc:
        PowerParams.from_proto(P.PowerConfig(orientation=P.PANEL_ORIENTATION_VERTICAL_FIXED))
    assert exc.value.code == "PANEL_AZIMUTH_REQUIRED"


def test_full_sun_generates_expected_power_and_stays_full() -> None:
    n = 5
    res = simulate(_grid(n), _sun(n), np.ones(n), PowerParams.from_proto(P.PowerConfig()))
    assert res.p_gen_w == pytest.approx([0.28 * 2 * SOLAR_CONSTANT_W_M2] * n)
    assert res.p_load_w == pytest.approx([150.0] * n)
    assert res.soc_pct == pytest.approx([100.0] * n)
    assert res.survives and res.first_brownout_time is None


@pytest.mark.parametrize(
    ("orientation", "el", "az", "factor"),
    [
        (P.PANEL_ORIENTATION_VERTICAL_TRACKING, 60.0, 90.0, 0.5),
        (P.PANEL_ORIENTATION_HORIZONTAL, 30.0, 90.0, 0.5),
        (P.PANEL_ORIENTATION_HORIZONTAL, -1.0, 90.0, 0.0),
        (P.PANEL_ORIENTATION_VERTICAL_FIXED, 0.0, 150.0, 0.5),  # 60° fuera del panel (az 90)
        (P.PANEL_ORIENTATION_VERTICAL_FIXED, 0.0, 270.0, 0.0),  # Sol detrás del panel
    ],
)
def test_panel_orientation_geometry(
    orientation: power_pb2.PanelOrientation, el: float, az: float, factor: float
) -> None:
    cfg = P.PowerConfig(orientation=orientation, panel_azimuth_deg=90.0)
    res = simulate(_grid(2), _sun(2, el, az), np.ones(2), PowerParams.from_proto(cfg))
    assert res.p_gen_w[0] == pytest.approx(0.28 * 2 * SOLAR_CONSTANT_W_M2 * factor, abs=1e-6)


def test_long_night_causes_brownout_at_expected_time() -> None:
    # 2000 Wh, DoD 80 % -> 1600 Wh útiles; 60 W / 0.95 = 63.16 Wh/h -> se agota a las 25.3 h
    n = 40
    res = simulate(_grid(n), _sun(n, el=-5.0), np.zeros(n), PowerParams.from_proto(P.PowerConfig()))
    assert not res.survives
    assert res.first_brownout_time == T0 + timedelta(hours=26)
    assert res.min_soc_pct == pytest.approx(20.0)
    assert res.p_load_w == pytest.approx([60.0] * n)
    assert res.energy_margin_wh < 0  # energía no servida durante el brownout


def test_energy_bookkeeping_with_charge_and_discharge_efficiency() -> None:
    cfg = P.PowerConfig(soc0_pct=50.0, panel_area_m2=0.5, load_day_w=100.0, load_night_w=100.0)
    params = PowerParams.from_proto(cfg)
    frac = np.array([1.0, 1.0, 0.0, 0.0, 0.0])
    res = simulate(_grid(5), _sun(5), frac, params)
    gen = 0.28 * 0.5 * SOLAR_CONSTANT_W_M2  # 190.54 W
    e = 1000.0
    e += (gen - 100.0) * 0.95 * 2  # 2 h cargando
    e -= 100.0 / 0.95 * 2  # 2 h descargando (la última muestra no integra)
    assert res.soc_pct[-1] == pytest.approx(100.0 * e / 2000.0)
    assert res.energy_margin_wh == pytest.approx(min(res.soc_pct) / 100 * 2000 - 400.0)


@settings(max_examples=30, deadline=None)
@given(st.lists(st.floats(min_value=0, max_value=1), min_size=2, max_size=30))
def test_without_load_the_battery_never_discharges(fracs: list[float]) -> None:
    cfg = P.PowerConfig(soc0_pct=40.0, load_day_w=0.0, load_night_w=0.0)
    n = len(fracs)
    res = simulate(_grid(n), _sun(n), np.array(fracs), PowerParams.from_proto(cfg))
    assert np.all(np.diff(res.soc_pct) >= -1e-9)
    assert res.survives
