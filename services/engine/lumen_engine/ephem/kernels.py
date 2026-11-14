"""Kernels SPICE requeridos (sección 8.2). Owner: R3 Efemérides/Ciencia.

Versiones fijadas y verificadas con SHA-256 en `data/scripts/download_kernels.sh`.
"""

from pathlib import Path

from lumen_engine.core.config import get_settings

REQUIRED_KERNELS: tuple[str, ...] = (
    "naif0012.tls",  # LSK: segundos intercalares UTC <-> TDB
    "de440s.bsp",  # SPK: Sol, Tierra, Luna (1849-2150)
    "moon_pa_de440_200625.bpc",  # PCK binario: orientación MOON_PA (DE440)
    "moon_de440_250416.tf",  # FK: MOON_ME -> MOON_ME_DE440_ME421
    "pck00011.tpc",  # PCK texto: radios y constantes
)


def kernel_paths(kernels_dir: Path | None = None) -> list[Path]:
    base = kernels_dir or get_settings().kernels_dir
    return [base / name for name in REQUIRED_KERNELS]


def missing_kernels(kernels_dir: Path | None = None) -> list[str]:
    """Nombres de kernels requeridos que no están en disco."""
    return [p.name for p in kernel_paths(kernels_dir) if not p.is_file()]
