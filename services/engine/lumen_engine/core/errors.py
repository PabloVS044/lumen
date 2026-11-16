"""Errores de dominio. Los módulos lanzan `EngineError`; `rpc/interceptors.py` los convierte en
errores Connect con un `lumen.v1.ErrorDetail` adjunto (código estable para el frontend)."""

from connectrpc.code import Code

# Códigos lanzados desde módulos de otros owners con el default INVALID_ARGUMENT, pero que no son
# culpa de la entrada (la petición es válida; faltan datos): se sirven como FAILED_PRECONDITION.
CODE_OVERRIDES: dict[str, Code] = {"INSUFFICIENT_DEM_RANGE": Code.FAILED_PRECONDITION}


class EngineError(Exception):
    connect_code: Code = Code.INVALID_ARGUMENT

    def __init__(self, code: str, message: str, context: dict[str, str] | None = None) -> None:
        super().__init__(message)
        if code in CODE_OVERRIDES:
            self.connect_code = CODE_OVERRIDES[code]
        self.code = code
        self.message = message
        self.context = context or {}


class NotFoundError(EngineError):
    connect_code = Code.NOT_FOUND


class NoCoverageError(EngineError):
    connect_code = Code.FAILED_PRECONDITION

    def __init__(self, lat: float, lon: float) -> None:
        super().__init__(
            "NO_COVERAGE", "No DEM layer covers this point.", {"lat": str(lat), "lon": str(lon)}
        )


class OutOfEphemerisRangeError(EngineError):
    connect_code = Code.OUT_OF_RANGE

    def __init__(self, start: str, end: str) -> None:
        super().__init__(
            "OUT_OF_EPHEMERIS_RANGE",
            "Time range is outside loaded SPICE kernel coverage.",
            {"start": start, "end": end},
        )


class NotImplementedYetError(EngineError):
    connect_code = Code.UNIMPLEMENTED

    def __init__(self, feature: str) -> None:
        super().__init__("NOT_IMPLEMENTED", f"{feature} is not implemented yet.")
