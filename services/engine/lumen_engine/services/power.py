"""PowerService (HU-07). Owner: R3 Efemérides/Ciencia."""

from datetime import datetime

from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import power_pb2
from lumen.v1.power_connect import PowerService

from lumen_engine.ephem.kernels import run_spice
from lumen_engine.power.run import simulate_scenario
from lumen_engine.rpc.context import Ctx


def _timestamp(t: datetime) -> Timestamp:
    ts = Timestamp()
    ts.FromDatetime(t)
    return ts


class PowerServiceImpl(PowerService):
    async def simulate(
        self, request: power_pb2.SimulateRequest, ctx: Ctx
    ) -> power_pb2.SimulateResponse:
        times, res = await run_spice(simulate_scenario, request)
        return power_pb2.SimulateResponse(
            time=[_timestamp(t) for t in times],
            p_gen_w=res.p_gen_w.tolist(),
            p_load_w=res.p_load_w.tolist(),
            soc_pct=res.soc_pct.tolist(),
            survives=res.survives,
            first_brownout_time=(
                _timestamp(res.first_brownout_time) if res.first_brownout_time else None
            ),
            min_soc_pct=res.min_soc_pct,
            energy_margin_wh=res.energy_margin_wh,
        )
