from pathlib import Path

import pytest

from lumen_engine.ephem.kernels import REQUIRED_KERNELS, kernel_paths, missing_kernels


def test_missing_kernels_reports_absent_files(tmp_path: Path) -> None:
    (tmp_path / REQUIRED_KERNELS[0]).write_text("x")
    assert missing_kernels(tmp_path) == list(REQUIRED_KERNELS[1:])


@pytest.mark.requires_kernels
def test_configured_kernels_are_present() -> None:
    assert all(p.is_file() for p in kernel_paths())


@pytest.mark.requires_kernels
def test_load_kernels_is_idempotent() -> None:
    from lumen_engine.ephem.kernels import load_kernels

    first = load_kernels()
    second = load_kernels()
    assert first == second == list(REQUIRED_KERNELS)


@pytest.mark.requires_kernels
def test_moon_me_is_de440_realization() -> None:
    from lumen_engine.ephem.kernels import moon_me_realization

    assert moon_me_realization() == "MOON_ME_DE440_ME421"


@pytest.mark.requires_kernels
def test_coverage_window_spans_supported_years() -> None:
    from datetime import UTC, datetime

    from lumen_engine.ephem.kernels import coverage_window

    start, end = coverage_window()
    assert start < datetime(1900, 1, 1, tzinfo=UTC)
    assert end > datetime(2149, 1, 1, tzinfo=UTC)


@pytest.mark.requires_kernels
def test_check_coverage_rejects_range_outside_kernels() -> None:
    from datetime import UTC, datetime

    from lumen_engine.core.errors import OutOfEphemerisRangeError
    from lumen_engine.ephem.kernels import check_coverage

    check_coverage(datetime(2027, 1, 1, tzinfo=UTC), datetime(2027, 2, 1, tzinfo=UTC))
    with pytest.raises(OutOfEphemerisRangeError):
        check_coverage(datetime(2149, 1, 1, tzinfo=UTC), datetime(2151, 1, 1, tzinfo=UTC))


def test_load_kernels_without_files_raises_unavailable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from connectrpc.code import Code

    from lumen_engine.ephem import kernels

    monkeypatch.setattr(kernels, "_loaded", [])
    monkeypatch.setattr(kernels, "missing_kernels", lambda: ["de440s.bsp"])
    with pytest.raises(kernels.KernelsMissingError) as exc:
        kernels.load_kernels()
    assert exc.value.connect_code == Code.UNAVAILABLE


def test_run_spice_executes_on_dedicated_thread() -> None:
    import asyncio
    import threading

    from lumen_engine.ephem.kernels import run_spice

    name = asyncio.run(run_spice(lambda: threading.current_thread().name))
    assert name.startswith("spice")
