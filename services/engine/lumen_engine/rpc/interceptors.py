"""Interceptores comunes a todos los servicios. Owner: R1."""

from collections.abc import Awaitable, Callable
from typing import Any

import protovalidate
from connectrpc.code import Code
from connectrpc.errors import ConnectError
from google.protobuf.message import Message
from lumen.v1 import common_pb2

from lumen_engine.core.errors import EngineError
from lumen_engine.rpc.context import Ctx


def _field_path(violation: Any) -> str:
    names = [e.field_name for e in violation.field.elements]
    return ".".join(names) or violation.rule_id or "_"


class ValidationInterceptor:
    """Aplica las reglas `buf.validate` del .proto a cada request → INVALID_ARGUMENT."""

    async def intercept_unary(
        self,
        call_next: Callable[[Any, Ctx], Awaitable[Any]],
        request: Any,
        ctx: Ctx,
    ) -> Any:
        if isinstance(request, Message):
            try:
                protovalidate.validate(request)
            except protovalidate.ValidationError as exc:
                fields = {_field_path(v.proto): v.proto.message for v in exc.violations}
                raise ConnectError(
                    Code.INVALID_ARGUMENT,
                    "Invalid request.",
                    [common_pb2.ErrorDetail(code="VALIDATION_ERROR", context=fields)],
                ) from exc
        return await call_next(request, ctx)


class DomainErrorInterceptor:
    """Convierte `EngineError` en `ConnectError` con `ErrorDetail`."""

    async def intercept_unary(
        self,
        call_next: Callable[[Any, Ctx], Awaitable[Any]],
        request: Any,
        ctx: Ctx,
    ) -> Any:
        try:
            return await call_next(request, ctx)
        except EngineError as exc:
            raise ConnectError(
                exc.connect_code,
                exc.message,
                [common_pb2.ErrorDetail(code=exc.code, context=exc.context)],
            ) from exc


INTERCEPTORS = (DomainErrorInterceptor(), ValidationInterceptor())
