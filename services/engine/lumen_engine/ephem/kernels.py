"""Kernels SPICE: lista, carga y cobertura (secciones 8.2, 9.4.1). Owner: R3 Efemérides/Ciencia.

Versiones fijadas y verificadas con SHA-256 en `data/scripts/download_kernels.sh`.
SPICE mantiene estado global en el proceso: la carga se hace una sola vez y bajo lock.
"""

import asyncio
import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from functools import lru_cache, partial
from pathlib import Path
from typing import Any

import spiceypy as sp
from connectrpc.code import Code

from lumen_engine.core.config import get_settings
from lumen_engine.core.errors import EngineError, OutOfEphemerisRangeError

REQUIRED_KERNELS: tuple[str, ...] = (
    "naif0012.tls",  # LSK: segundos intercalares UTC <-> TDB
    "de440s.bsp",  # SPK: Sol, Tierra, Luna (1849-2150)
    "moon_pa_de440_200625.bpc",  # PCK binario: orientación MOON_PA (DE440)
    "moon_de440_250416.tf",  # FK: MOON_ME -> MOON_ME_DE440_ME421
    "pck00011.tpc",  # PCK texto: radios y constantes
)

_SPK = "de440s.bsp"
_PCK = "moon_pa_de440_200625.bpc"
_MOON_NAIF_ID = 301
_MOON_PA_DE440_FRAME_ID = 31008
_MOON_ME_FRAME_ID = 31001
_SPICE_UTC_FORMAT = "ISOC"


class KernelsMissingError(EngineError):
    """El motor está desplegado sin los kernels: es un problema del servidor, no del request."""

    connect_code = Code.UNAVAILABLE

    def __init__(self, missing: list[str]) -> None:
        super().__init__(
            "KERNELS_MISSING",
            "SPICE kernels are not installed on the engine.",
            {"missing": ",".join(missing)},
        )


_lock = threading.Lock()
_loaded: list[str] = []

# CSPICE no es thread-safe (estado global): todo cálculo SPICE del servidor pasa por este hilo,
# y así no bloquea el event loop de ASGI.
_spice_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="spice")


async def run_spice[T](fn: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """Ejecuta `fn` (que usa SPICE) en el hilo dedicado de SPICE."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_spice_executor, partial(fn, *args, **kwargs))


def kernel_paths(kernels_dir: Path | None = None) -> list[Path]:
    base = kernels_dir or get_settings().kernels_dir
    return [base / name for name in REQUIRED_KERNELS]


def missing_kernels(kernels_dir: Path | None = None) -> list[str]:
    """Nombres de kernels requeridos que no están en disco."""
    return [p.name for p in kernel_paths(kernels_dir) if not p.is_file()]


def load_kernels() -> list[str]:
    """Carga (una vez por proceso) los kernels requeridos y devuelve sus nombres."""
    with _lock:
        if not _loaded:
            missing = missing_kernels()
            if missing:
                raise KernelsMissingError(missing)
            for path in kernel_paths():
                sp.furnsh(str(path))
            _loaded.extend(REQUIRED_KERNELS)
        return list(_loaded)


def moon_me_realization() -> str:
    """Marco concreto al que apunta el alias MOON_ME (debe ser la realización DE440)."""
    load_kernels()
    relative: list[str] = sp.gcpool(f"TKFRAME_{_MOON_ME_FRAME_ID}_RELATIVE", 0, 1)
    return relative[0]


def _et_to_datetime(et: float) -> datetime:
    iso = sp.et2utc(et, _SPICE_UTC_FORMAT, 3)
    return datetime.fromisoformat(iso).replace(tzinfo=UTC)


@lru_cache(maxsize=1)
def coverage_window() -> tuple[datetime, datetime]:
    """Intervalo UTC cubierto a la vez por las efemérides (SPK) y la orientación lunar (PCK)."""
    load_kernels()
    base = get_settings().kernels_dir
    spk = sp.spkcov(str(base / _SPK), _MOON_NAIF_ID)
    pck = sp.stypes.SPICEDOUBLE_CELL(2000)
    sp.pckcov(str(base / _PCK), _MOON_PA_DE440_FRAME_ID, pck)
    spk_start, spk_end = sp.wnfetd(spk, 0)
    pck_start, pck_end = sp.wnfetd(pck, 0)
    return _et_to_datetime(max(spk_start, pck_start)), _et_to_datetime(min(spk_end, pck_end))


def check_coverage(start: datetime, end: datetime) -> None:
    """Lanza `OutOfEphemerisRangeError` si [start, end] sale de la cobertura de los kernels."""
    lo, hi = coverage_window()
    if start < lo or end > hi:
        raise OutOfEphemerisRangeError(start.isoformat(), end.isoformat())
