from typing import Any

from connectrpc.request import RequestContext

# Contexto de request Connect sin parametrizar (los stubs generados usan la forma genérica).
Ctx = RequestContext[Any, Any]
