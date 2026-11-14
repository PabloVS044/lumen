from pathlib import Path

import pytest

from lumen_engine.ephem.kernels import REQUIRED_KERNELS, kernel_paths, missing_kernels


def test_missing_kernels_reports_absent_files(tmp_path: Path) -> None:
    (tmp_path / REQUIRED_KERNELS[0]).write_text("x")
    assert missing_kernels(tmp_path) == list(REQUIRED_KERNELS[1:])


@pytest.mark.requires_kernels
def test_configured_kernels_are_present() -> None:
    assert all(p.is_file() for p in kernel_paths())
