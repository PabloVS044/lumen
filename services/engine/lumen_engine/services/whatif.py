"""WhatIfService (HU-08). Owner: R3 Efemérides/Ciencia."""

from google.protobuf.timestamp_pb2 import Timestamp
from lumen.v1 import whatif_pb2
from lumen.v1.whatif_connect import WhatIfService

from lumen_engine.ephem.kernels import run_spice
from lumen_engine.metrics.whatif import WhatIfPoint, evaluate_request
from lumen_engine.rpc.context import Ctx


def _point(p: WhatIfPoint) -> whatif_pb2.WhatIfPoint:
    landing = Timestamp()
    landing.FromDatetime(p.landing)
    return whatif_pb2.WhatIfPoint(
        delay_hours=p.delay_hours, landing=landing, metrics=p.metrics, survives=p.survives
    )


class WhatIfServiceImpl(WhatIfService):
    async def evaluate(
        self, request: whatif_pb2.EvaluateRequest, ctx: Ctx
    ) -> whatif_pb2.EvaluateResponse:
        res = await run_spice(evaluate_request, request)
        return whatif_pb2.EvaluateResponse(
            points=[_point(p) for p in res.points],
            recommended_delays_hours=res.recommended_delays_hours,
        )
