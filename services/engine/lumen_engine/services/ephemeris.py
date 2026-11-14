"""EphemerisService. Owner: R3 Efemérides/Ciencia."""

from datetime import UTC, datetime

from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import common_pb2, ephemeris_pb2
from lumen.v1.ephemeris_connect import EphemerisService

from lumen_engine.ephem import spice
from lumen_engine.ephem.geometry import FloatArray
from lumen_engine.ephem.kernels import run_spice
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
        # TODO(R2): pasar terrain_height_m del DEM cuando exista TerrainService.GetTerrainPoint.
        res = await run_spice(spice.series, request.site, request.range)
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

    # list_events: requiere visibilidad + horizonte (Fase 4); el stub responde UNIMPLEMENTED.
