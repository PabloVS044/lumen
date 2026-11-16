from tests.conftest import ConnectJSON


def test_get_report_serves_published_checks(rpc: ConnectJSON) -> None:
    r = rpc.call("ValidationService", "GetReport")
    assert r.status_code == 200, r.text
    checks = {c["id"]: c for c in r.json()["checks"]}
    assert {
        "ephemeris_sun_vs_horizons",
        "ephemeris_earth_vs_horizons",
        "eclipse_vs_spice_occult",
        "illumination_site01_rois_vs_pgda",
    } == set(checks)
    assert all(c["passed"] for c in checks.values())
    assert checks["ephemeris_sun_vs_horizons"]["tolerance"] == 0.01
