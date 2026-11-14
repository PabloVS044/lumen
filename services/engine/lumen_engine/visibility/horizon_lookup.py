"""Elevación del horizonte en azimuts arbitrarios (sección 9.3, "Interpolación de la máscara").
Owner: R3 Efemérides/Ciencia.

La máscara (R2, `HorizonMask.elevation_deg`) empieza en az = 0 y avanza en pasos de `az_step_deg`.
"""

import numpy as np

from lumen_engine.visibility.disk import FloatArray


def horizon_at(az_deg: FloatArray, mask_el_deg: FloatArray, az_step_deg: float) -> FloatArray:
    """Interpolación lineal entre los dos azimuts vecinos de la máscara, con wrap en 360°."""
    n = mask_el_deg.size
    if not np.isclose(n * az_step_deg, 360.0):
        raise ValueError(f"mask of {n} samples x {az_step_deg} deg does not cover 360 deg")
    pos = np.mod(az_deg, 360.0) / az_step_deg
    i0 = np.floor(pos).astype(np.int64) % n
    i1 = (i0 + 1) % n
    w = pos - np.floor(pos)
    out: FloatArray = (1.0 - w) * mask_el_deg[i0] + w * mask_el_deg[i1]
    return out
