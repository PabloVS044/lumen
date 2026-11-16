"""El COG global (infra/fly/make_global_cog.py) da las mismas alturas que el JP2 original.

Se leen ~200 puntos aleatorios (semilla fija) de toda la Luna con el lector del propio motor
(`read_points`) sobre la capa global del índice JP2 y la del índice COG.
"""

import dataclasses
from pathlib import Path

import numpy as np
import pytest

from lumen_engine.core.config import REPO_ROOT
from lumen_engine.dem.index import Layer, load_index
from lumen_engine.dem.raster import read_points

pytestmark = pytest.mark.requires_dem

GLOBAL_ID = "PDS_LOLA_global_128ppd"
JP2_DIR = REPO_ROOT / "data" / "local" / "dem"
COG_DIR = REPO_ROOT / "data" / "local" / "dem_cog"


def _global_layer(directory: Path) -> Layer:
    layers = load_index(str(directory / "index.json"), str(directory))
    return next(layer for layer in layers if layer.id == GLOBAL_ID)


@pytest.mark.skipif(not (COG_DIR / "index.json").is_file(), reason="falta data/local/dem_cog")
def test_cog_heights_equal_jp2() -> None:
    jp2, cog = _global_layer(JP2_DIR), _global_layer(COG_DIR)
    assert jp2.path.endswith(".JP2") and cog.path.endswith("_cog.tif")
    assert dataclasses.replace(cog, path=jp2.path) == jp2  # misma escala, resolución, datum

    rng = np.random.default_rng(20260101)
    n = 200
    lat = np.degrees(np.arcsin(rng.uniform(-1, 1, n)))  # uniforme sobre la esfera
    lon = rng.uniform(-180, 180, n)
    # Las lecturas se hacen una a una: read_points toma la ventana envolvente de todos los puntos.
    a = np.array([read_points(jp2, lon[i : i + 1], lat[i : i + 1])[0] for i in range(n)])
    b = np.array([read_points(cog, lon[i : i + 1], lat[i : i + 1])[0] for i in range(n)])
    assert np.isfinite(a).sum() > 0.9 * n
    np.testing.assert_allclose(b, a, rtol=0, atol=1e-6, equal_nan=True)
