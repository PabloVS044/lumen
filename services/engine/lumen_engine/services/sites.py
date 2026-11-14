"""SiteService. Owner: R1 (servicio); el contenido del catálogo es de R7."""

from lumen.v1 import sites_pb2
from lumen.v1.sites_connect import SiteService

from lumen_engine.catalog import loader
from lumen_engine.rpc.context import Ctx


class SiteServiceImpl(SiteService):
    async def list_sites(
        self, request: sites_pb2.ListSitesRequest, ctx: Ctx
    ) -> sites_pb2.ListSitesResponse:
        return sites_pb2.ListSitesResponse(sites=loader.list_sites(request))

    async def get_site(
        self, request: sites_pb2.GetSiteRequest, ctx: Ctx
    ) -> sites_pb2.GetSiteResponse:
        return sites_pb2.GetSiteResponse(site=loader.get_site(request.id))
