"""Secreto compartido BFF → motor (header `x-lumen-secret`). Owner: R1.

El motor se despliega público; el BFF de Next.js es el único cliente legítimo. Con
`ENGINE_SHARED_SECRET` no vacío, toda petición sin el header correcto recibe 401 (error Connect
JSON), salvo `GET /healthz` (liveness de infra) y el preflight CORS (OPTIONS).
"""

import hmac
import json

from starlette.types import ASGIApp, Receive, Scope, Send

SECRET_HEADER = b"x-lumen-secret"
OPEN_PATHS = frozenset({"/healthz"})
_BODY = json.dumps(
    {"code": "unauthenticated", "message": "Missing or invalid credentials."}
).encode()


class SharedSecretMiddleware:
    def __init__(self, app: ASGIApp, secret: str) -> None:
        self.app = app
        self._secret = secret.encode()

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or not self._secret or self._is_open(scope):
            await self.app(scope, receive, send)
            return
        given = next((v for k, v in scope["headers"] if k == SECRET_HEADER), b"")
        if hmac.compare_digest(given, self._secret):
            await self.app(scope, receive, send)
            return
        await send(
            {
                "type": "http.response.start",
                "status": 401,
                "headers": [
                    (b"content-type", b"application/json"),
                    (b"content-length", str(len(_BODY)).encode()),
                ],
            }
        )
        await send({"type": "http.response.body", "body": _BODY})

    @staticmethod
    def _is_open(scope: Scope) -> bool:
        method = scope["method"]
        return method == "OPTIONS" or (method == "GET" and scope["path"] in OPEN_PATHS)
