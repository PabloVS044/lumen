"""Altura del terreno en el sitio para las efemérides (sección 9.2). Owner: R3 Efemérides/Ciencia.

Usa el DEM de R2 (`dem.coverage.sample_height`). Si no hay cobertura DEM instalada para el punto,
se usa la esfera de referencia (0 m): el error en az/el es < 0.001° (paralaje de pocos km frente a
384 000 km), así que las efemérides siguen siendo válidas. El horizonte y la visibilidad, en cambio,
sí exigen DEM y fallan con NO_COVERAGE (`visibility.site`).
"""

from lumen_engine.core.defaults import normalize_lon
from lumen_engine.core.errors import NoCoverageError
from lumen_engine.dem.coverage import sample_height


def site_terrain_height_m(lat: float, lon: float) -> float:
    """Altura del terreno (m sobre la esfera de 1737.4 km); 0 si no hay DEM para el punto."""
    try:
        height, _ = sample_height(lat, normalize_lon(lon))
    except NoCoverageError:
        return 0.0
    return height
