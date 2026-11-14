from tests.conftest import ConnectJSON


def test_health(rpc: ConnectJSON) -> None:
    r = rpc.call("HealthService", "Check")
    assert r.status_code == 200
    assert r.json()["status"] == "STATUS_OK"


def test_list_sites_filters_by_region(rpc: ConnectJSON) -> None:
    r = rpc.call("SiteService", "ListSites", {"region": "REGION_SOUTH_POLE"})
    assert r.status_code == 200
    sites = r.json()["sites"]
    assert sites
    assert all(s["region"] == "REGION_SOUTH_POLE" for s in sites)


def test_get_site_not_found_has_error_detail(rpc: ConnectJSON) -> None:
    r = rpc.call("SiteService", "GetSite", {"id": "nope"})
    assert r.status_code == 404
    body = r.json()
    assert body["code"] == "not_found"
    assert body["details"][0]["type"] == "lumen.v1.ErrorDetail"


def test_protovalidate_rejects_out_of_range_lat(rpc: ConnectJSON) -> None:
    r = rpc.call("TerrainService", "GetCoverage", {"point": {"lat": 200, "lon": 0}})
    assert r.status_code == 400
    assert r.json()["code"] == "invalid_argument"


def test_protovalidate_rejects_inverted_time_range(rpc: ConnectJSON) -> None:
    body = {
        "site": {"lat": -89.45, "lon": 222.69},
        "range": {"start": "2027-02-01T00:00:00Z", "end": "2027-01-01T00:00:00Z"},
    }
    r = rpc.call("AnalysisService", "Analyze", body)
    assert r.status_code == 400


def test_unimplemented_rpc(rpc: ConnectJSON) -> None:
    r = rpc.call("JobService", "GetJob", {"jobId": "j_1"})
    assert r.status_code == 501
    assert r.json()["code"] == "unimplemented"


def test_domain_not_implemented_maps_to_unimplemented(rpc: ConnectJSON) -> None:
    body = {
        "site": {"lat": -89.45, "lon": 222.69},
        "range": {"start": "2027-01-01T00:00:00Z", "end": "2027-02-01T00:00:00Z"},
    }
    r = rpc.call("AnalysisService", "Analyze", body)
    assert r.status_code == 501
