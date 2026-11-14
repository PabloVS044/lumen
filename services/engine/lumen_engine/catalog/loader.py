"""Carga el catálogo curado desde data/catalog/sites.yaml (sección 13). Owner: R1."""

from functools import lru_cache

import yaml
from lumen.v1 import sites_pb2

from lumen_engine.core.config import get_settings
from lumen_engine.core.errors import NotFoundError

_STATUS = {
    "candidate": sites_pb2.SITE_STATUS_CANDIDATE,
    "landed": sites_pb2.SITE_STATUS_LANDED,
    "planned": sites_pb2.SITE_STATUS_PLANNED,
    "historic": sites_pb2.SITE_STATUS_HISTORIC,
}
_REGION = {
    "south_pole": sites_pb2.REGION_SOUTH_POLE,
    "north_pole": sites_pb2.REGION_NORTH_POLE,
    "nearside": sites_pb2.REGION_NEARSIDE,
    "farside": sites_pb2.REGION_FARSIDE,
}


def _to_proto(item: dict[str, object]) -> sites_pb2.CatalogSite:
    data = dict(item)
    status = _STATUS[str(data.pop("status"))]
    region = _REGION[str(data.pop("region"))]
    return sites_pb2.CatalogSite(status=status, region=region, **data)  # type: ignore[arg-type]


@lru_cache
def _load() -> tuple[sites_pb2.CatalogSite, ...]:
    with get_settings().catalog_path.open(encoding="utf-8") as f:
        raw = yaml.safe_load(f) or []
    return tuple(_to_proto(item) for item in raw)


def list_sites(req: sites_pb2.ListSitesRequest) -> list[sites_pb2.CatalogSite]:
    sites = list(_load())
    if req.HasField("program"):
        sites = [s for s in sites if s.program.lower() == req.program.lower()]
    if req.HasField("country"):
        sites = [s for s in sites if s.country.lower() == req.country.lower()]
    if req.region != sites_pb2.REGION_UNSPECIFIED:
        sites = [s for s in sites if s.region == req.region]
    if req.HasField("query"):
        needle = req.query.lower()
        sites = [s for s in sites if needle in s.name.lower() or needle in s.id]
    return sites


def get_site(site_id: str) -> sites_pb2.CatalogSite:
    for s in _load():
        if s.id == site_id:
            return s
    raise NotFoundError("SITE_NOT_FOUND", f"Site '{site_id}' not in catalog.", {"id": site_id})
