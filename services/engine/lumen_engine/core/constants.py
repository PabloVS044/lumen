"""Constantes físicas y convenciones. Fuente: sección 0 y 4.8 del documento técnico.

No duplicar estos valores en otros módulos: importarlos de aquí.
"""

MOON_RADIUS_M = 1_737_400.0  # esfera de referencia LOLA
SUN_RADIUS_KM = 695_700.0
EARTH_RADIUS_KM = 6_371.0
SOLAR_CONSTANT_W_M2 = 1361.0
AU_KM = 149_597_870.7

DEFAULT_OBS_HEIGHT_M = 2.0
DEFAULT_AZ_STEP_DEG = 0.25
DEFAULT_MAX_RANGE_KM = 200.0
MAX_SAMPLES = 100_000

# Proyección estereográfica polar sur de los DEM LOLA (⚠️ VERIFICAR por GeoTIFF, sección 4.7)
SOUTH_POLAR_STEREO_PROJ4 = (
    "+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs"
)
BODY_FIXED_FRAME = "MOON_ME"
