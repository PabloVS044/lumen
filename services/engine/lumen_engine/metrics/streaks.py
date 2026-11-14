"""Rachas, ventanas y eventos. Owner: Efemérides/Ciencia. Sección 9.6."""

import numpy as np
import numpy.typing as npt


def longest_run(mask: npt.NDArray[np.bool_], value: bool) -> tuple[int, int, int]:
    """(longitud, índice_inicio, índice_fin_exclusivo) de la racha más larga igual a `value`.

    Devuelve (0, 0, 0) si no hay ninguna. Una racha que toca índice 0 o N es "truncada" (9.6).
    """
    target = mask == value
    if not target.any():
        return 0, 0, 0
    padded = np.concatenate(([False], target, [False]))
    edges = np.flatnonzero(np.diff(padded.astype(np.int8)))
    starts, ends = edges[0::2], edges[1::2]
    k = int(np.argmax(ends - starts))
    return int(ends[k] - starts[k]), int(starts[k]), int(ends[k])


def run_count(mask: npt.NDArray[np.bool_], value: bool) -> int:
    """Número de rachas consecutivas iguales a `value`."""
    target = (mask == value).astype(np.int8)
    return int(np.count_nonzero(np.diff(np.concatenate(([0], target))) == 1))
