"""EphemerisService. Owner: R3 Efemérides/Ciencia."""

import asyncio
from datetime import UTC, datetime

from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2, ephemeris_pb2
from lumen.v1.ephemeris_connect import EphemerisService

from lumen_engine.ephem import spice
from lumen_engine.ephem.geometry import FloatArray
from lumen_engine.ephem.kernels import run_spice
from lumen_engine.ephem.terrain import site_terrain_height_m
from lumen_engine.metrics.upcoming import upcoming_events
from lumen_engine.rpc.context import Ctx


def _timestamp(t: datetime) -> Timestamp:
    ts = Timestamp()
    ts.FromDatetime(t)
    return ts


def _body(b: spice.BodyEphemeris) -> common_pb2.BodySeries:
    return common_pb2.BodySeries(
        az_deg=b.az_deg.tolist(), el_deg=b.el_deg.tolist(), dist_km=b.dist_km.tolist()
    )


def _vector(v: FloatArray) -> ephemeris_pb2.Vector3:
    return ephemeris_pb2.Vector3(x=float(v[0]), y=float(v[1]), z=float(v[2]))


class EphemerisServiceImpl(EphemerisService):
    async def get_series(
        self, request: ephemeris_pb2.GetSeriesRequest, ctx: Ctx
    ) -> ephemeris_pb2.GetSeriesResponse:
        site = request.site
        # Lectura de DEM (I/O de rasterio): fuera del event loop, sin ocupar el hilo de SPICE.
        h0 = await asyncio.to_thread(site_terrain_height_m, site.lat, site.lon)
        res = await run_spice(spice.series, site, request.range, terrain_height_m=h0)
        return ephemeris_pb2.GetSeriesResponse(
            time=[_timestamp(t) for t in res.grid.datetimes()],
            sun=_body(res.sun),
            earth=_body(res.earth),
        )

    async def get_state(
        self, request: ephemeris_pb2.GetStateRequest, ctx: Ctx
    ) -> ephemeris_pb2.GetStateResponse:
        st = await run_spice(spice.state, request.time.ToDatetime(tzinfo=UTC))
        return ephemeris_pb2.GetStateResponse(
            time=_timestamp(st.time), sun_dir=_vector(st.sun_dir), earth_dir=_vector(st.earth_dir)
        )

    async def list_events(
        self, request: ephemeris_pb2.ListEventsRequest, ctx: Ctx
    ) -> ephemeris_pb2.ListEventsResponse:
        start = getattr(request, "from").ToDatetime(tzinfo=UTC)  # `from` es palabra reservada
        events = await run_spice(
            upcoming_events, request.site, start, request.horizon_days, set(request.types)
        )
        return ephemeris_pb2.ListEventsResponse(events=events)
