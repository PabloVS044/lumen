# Validación

Owner: R3 Efemérides/Ciencia. Resultados de la sección 14 que alimentan `/validation`.
El motor los sirve en `ValidationService.GetReport` (generado con
`uv run python -m tests.validation.tools.build_report`; un test exige que esté al día).

| Prueba                                                    | Tolerancia              | Estado                                                                                |
| --------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| Sol/Tierra az/el vs JPL Horizons, 5 sitios × 20 instantes | ≤ 0.01°                 | ✅ máx. 5.4e-7° (ver abajo)                                                           |
| Ventanas del eclipse 2026-03-03 vs CSPICE `occult()`      | ≤ 3 min                 | ✅ máx. 1 min (ver abajo)                                                             |
| Horizonte DEM sintético plano                             | 1e-4°                   | ✅ test sintético en 8 azimuts; incluye curvatura y dip                               |
| Horizonte montaña sintética a 2 km                        | 0.2° por píxel/muestreo | ✅ el rumbo este detecta la cresta y su distancia                                     |
| Convergencia paso radial / alcance, Site01                | reportar Δ máximo       | ✅ 0.0409° con paso radial/2; 0° de 200 a 250 km (ver abajo)                          |
| % iluminación en las RoIs de PGDA Site01 (Barker 2021)    | > 70 % en cada RoI      | ✅ 74.4–84.7 % en las 7 RoIs (ver abajo)                                              |
| % iluminación vs tablas de Mazarico 2011 / Barker 2021    | documentar diferencias  | 🟡 artículos bajo muro de pago ([#10](https://github.com/PabloVS044/lumen/issues/10)) |

## Horizonte LOLA (secciones 9.3 y 14.2)

Los tests `services/engine/tests/unit/test_dem_horizon.py` crean un GeoTIFF lunar sintético sin
red: comprueban horizonte plano contra el dip analítico a 2 m, una montaña de 100 m a 2 km al
este, y el fallback de lectura bilineal. Para Site01 (coordenada de catálogo aproximada
−89.45°, −137.31°), una corrida local con el LDEM de 5 m y la capa polar de 80 m produjo 1 440
azimuts. Al reducir a la mitad el paso radial, la diferencia máxima fue **0.0409°** (percentil
99: **0.0163°**). Al ampliar el alcance de 200 a 250 km no cambió el perfil. La capa fina y el
conteo LDEC local indican que **8 de 9 píxeles** alrededor del punto no tienen retorno LOLA directo;
esto es una advertencia de precisión, no una medición de exactitud del horizonte.

Estas pruebas verifican geometría y estabilidad numérica. Aún falta comparación visual contra
QuickMap/Moon Trek y comparación de porcentajes de iluminación para periodos idénticos contra
la literatura. El RPC público `ValidationService.GetReport` sigue mostrando por ahora solo las
pruebas de efemérides y eclipse que genera R3.

El respaldo global PDS LDEM_128 se probó localmente en Apollo 11 (0.674°, 23.473°): lectura de
altura −1934.43 m sobre la esfera de referencia y pendiente local 0.79°. También se generaron
COG regionales de prueba de 3×3 celdas para Site01 y Apollo 11. Son pruebas de integración,
no validaciones de exactitud contra una fuente independiente. Los tests unitarios cubren la
escala de 0.5 m del JP2 y la continuidad en ±180° de longitud. La cobertura de líneas de
`dem/`, `horizon/` y `search/` fue 89 % (145 tests no marcados `network`).

Una prueba local adicional con dos clones reales de Site01 ejecutó el percentil de horizonte
p5–p95; la anchura mediana fue 0.080° y la máxima 1.059° entre 360 azimuts. Solo comprueba la
compatibilidad de los archivos. Dos clones son insuficientes para estimar una distribución de
incertidumbre; se necesitan más realizaciones para comunicar intervalos estables.

## Efemérides vs JPL Horizons (sección 14.1)

**Resultado:** el motor coincide con Horizons en azimut y elevación aparentes del Sol y la Tierra con un
error máximo de **5.4 × 10⁻⁷°** (≈ 2 milisegundos de arco), unas 20 000 veces por debajo de la tolerancia
exigida (0.01°). Distancias: error relativo < 1 × 10⁻⁸.

Test: `services/engine/tests/validation/test_vs_horizons.py`. Además de la tolerancia del doc se exige una
cota de regresión de 1 × 10⁻⁵°.

### Metodología

- **Referencia:** JPL Horizons API v1.2, consultada el 2026-11-14.
  - Script reproducible con semilla fija: `tests/validation/tools/fetch_horizons.py`.
  - Respuestas grabadas en `tests/validation/fixtures/horizons_sun_earth.json`, así que CI no usa red.
- **Sitios** (coordenadas aproximadas del catálogo; motor y Horizons usan exactamente las mismas):

  | Sitio                       | Lat    | Lon (E+) | Por qué                            |
  | --------------------------- | ------ | -------- | ---------------------------------- |
  | Connecting ridge (polo sur) | −89.45 | −137.31  | Sol rasante, Tierra cerca de 0°    |
  | Malapert (polo sur)         | −86.0  | 0.0      | Sitio candidato de Artemis         |
  | Apollo 15 (latitud media)   | 26.132 | 3.634    | Geometría intermedia               |
  | Chang'e-4 (cara oculta)     | −45.44 | 177.60   | Tierra siempre bajo el horizonte   |
  | Apollo 11 (ecuatorial)      | 0.674  | 23.473   | Tierra alta; contraste con el polo |

- **Instantes:** 20 aleatorios en 2026–2028 (semilla `20261114`) × Sol y Tierra = 400 comparaciones.
- **Observador:** 2 m sobre la esfera de 1737.4 km (altura del terreno = 0 en ambos lados).
- **Error de azimut:** se mide como arco (Δaz · cos el), para que no se infle cerca del cénit.

### Resultados por caso

| Sitio            | Cuerpo | máx. Δaz·cos(el) | máx. Δel | máx. Δrango rel. |
| ---------------- | ------ | ---------------- | -------- | ---------------- |
| Connecting ridge | Sol    | 9.3e-9°          | 9.7e-10° | 1.5e-11          |
| Connecting ridge | Tierra | 5.4e-7°          | 5.1e-8°  | 1.0e-8           |
| Malapert         | Sol    | 9.0e-9°          | 1.1e-9°  | 1.5e-11          |
| Malapert         | Tierra | 5.4e-7°          | 5.0e-8°  | 1.0e-8           |
| Apollo 15        | Sol    | 5.3e-9°          | 8.2e-9°  | 1.5e-11          |
| Apollo 15        | Tierra | 5.4e-7°          | 1.2e-7°  | 1.0e-8           |
| Chang'e-4        | Sol    | 6.8e-9°          | 5.7e-9°  | 1.5e-11          |
| Chang'e-4        | Tierra | 5.4e-7°          | 1.2e-7°  | 1.0e-8           |
| Apollo 11        | Sol    | 8.0e-10°         | 8.7e-9°  | 1.5e-11          |
| Apollo 11        | Tierra | 1.4e-7°          | 5.4e-7°  | 1.0e-8           |

### Diferencias de convención y modelo entre motor y Horizons

| Aspecto                      | Motor LUMEN                           | Horizons                                               | Efecto                                                         |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| Efeméride planetaria         | DE440 (`de440s.bsp`)                  | DE441                                                  | Mismo ajuste en el rango moderno; despreciable                 |
| Marco lunar                  | `MOON_ME` → `MOON_ME_DE440_ME421`     | `MEAN_ME (high precision)`                             | Equivalentes                                                   |
| Forma lunar / vertical local | Esfera R = 1737.4 km, vertical radial | Esfera 1737.4 km                                       | Idénticos                                                      |
| Corrección aparente          | `LT+S` (tiempo de luz + aberración)   | Aparente + flexión relativista de la luz (Sol, Tierra) | ≤ 5e-7°; origen probable del residuo de la Tierra (no aislado) |
| Refracción                   | Ninguna (sin atmósfera)               | `APPARENT=AIRLESS`                                     | Idénticos                                                      |
| Azimut                       | Desde el norte, sentido horario       | Desde el norte, hacia el este                          | Idénticos                                                      |
| Escala de tiempo de entrada  | UTC → ET con LSK `naif0012.tls`       | UT                                                     | Idénticos desde 1972                                           |

La diferencia entre los marcos ME y PA en DE440 es una rotación de ≈ 0.02886° (≈ 875 m en la superficie),
según el FK `moon_de440_250416.tf`. Usar PA en lugar de ME sería un error visible frente a esta validación;
el motor usa ME en todo el pipeline.

### Limitaciones

- Valida la geometría Sol/Tierra **sin terreno**: no valida el horizonte (R2) ni las métricas de visibilidad.
- Coordenadas de sitios aproximadas: no afectan a la validación, porque ambos lados usan las mismas.

## Eclipses vs CSPICE `occult()` (sección 9.4.4)

**Resultado:** en el eclipse lunar total del 2026-03-03, las ventanas parcial y total del motor coinciden con
CSPICE `occult()` con una diferencia máxima de **1 minuto** (resolución de 1 min; tolerancia 3 min).

| Ventana | CSPICE (centro lunar) | Motor (punto sub-Tierra) |
| ------- | --------------------- | ------------------------ |
| Parcial | 09:18 – 13:50 UTC     | 09:17 – 13:50 UTC        |
| Total   | 10:26 – 12:41 UTC     | 10:25 – 12:42 UTC        |

- `occult()` observa desde el centro lunar, así que el motor se evalúa en el punto sub-Tierra de ese instante (0.49°, 4.74°), donde la dirección a la Tierra coincide con la del centro.
- Desde otros sitios la ventana se desplaza por **paralaje**: desde Apollo 11 llega unos 10 minutos más tarde. Es un efecto real, no un error.
- Diferencias de modelo: SPICE usa el elipsoide terrestre (6378/6357 km); el motor, una esfera de 6371 km. Ninguno modela la luz refractada por la atmósfera terrestre.

Test: `services/engine/tests/unit/test_eclipse.py`.

## Integración con el horizonte real LOLA (Site01)

Los RPC de visibilidad de R3 (`ListEvents`, `Simulate`, `WhatIf`) se probaron contra la máscara de
horizonte real de R2: DEM PGDA Site01 de 5 m más el polar de 80 m, alcance de 200 km y paso de 0.25°.
Test: `services/engine/tests/api/test_terrain_integration.py`. Requiere `data/scripts/prepare_dem.py`
(≈ 312 MB), así que se salta en CI.

Iluminación en 2027 (paso de 1 h, observador a 2 m, Sol visible con el centro del disco):

| Punto                                     | Altura   | Pendiente | Horizonte mediano | Iluminación | Tierra visible |
| ----------------------------------------- | -------- | --------- | ----------------- | ----------- | -------------- |
| Coordenada del catálogo (−89.45, −137.31) | 1954.6 m | 9.3°      | +0.02°            | 52.8 %      | 37.5 %         |
| Cresta a 300 m (−89.4403, −137.134)       | 1958.3 m | 1.8°      | −1.48°            | 85.3 %      | 51.1 %         |

- **La cresta coincide en orden de magnitud con lo publicado** para la Connecting ridge (~80–90 %, Mazarico et al. 2011). La comparación formal, con el mismo periodo y la misma altura, sigue pendiente en [#10](https://github.com/PabloVS044/lumen/issues/10).
- **La coordenada del catálogo es aproximada** (`verified: false`) y cae en una ladera de 9°. Ahí el suelo contiguo tapa el horizonte, que queda en torno a 0° con el obstáculo a pocos metros. Hay que verificarla antes de usarla como sitio de referencia (R7).
- Es exactamente el efecto que motiva el proyecto (secciones 2.3 y 18.3): **moverse 300 m cambia la iluminación de 53 % a 85 %**. Lo cubre `test_ridge_crest_is_far_better_lit_than_nearby_slope`.
- La "cresta" es el punto más alto del DEM de 5 m en un radio de 2 km (búsqueda simple en anillos de 100 m), no un sitio oficial.

## Iluminación vs PGDA Site01 (sección 14.3)

**Referencia (fuente primaria):** NASA PGDA, producto 78 (Barker et al. 2021, https://pgda.gsfc.nasa.gov/products/78).

- PGDA publica las **regiones de interés (RoIs) de Site01** (Connecting ridge) como shapefile: `Site01_ROIs.tgz`, derivado de `…_regionProps_avgillGT070`.
- Son las regiones con **iluminación media > 70 % a 1 m sobre la superficie entre el 2024-01-01 y el 2026-01-01**.
- La página dice además que las RoIs 4–6 _"generally have the most favorable illumination conditions"_.

**Método:**

- Mismo periodo, misma altura (1 m) y mismos puntos: el punto etiqueta de cada RoI, convertido desde la estereográfica polar.
- Horizonte propio del motor: DEM de 5 m más el polar de 80 m, alcance de 200 km.
- Se mide la fracción media del disco solar visible.
- 2024 es bisiesto y el rango tiene 731 días (el límite del motor es 730), así que se calcula por años y se combina.

| RoI | Lat       | Lon       | Altura   | Pendiente | Iluminación media |
| --- | --------- | --------- | -------- | --------- | ----------------- |
| 1   | −89.43893 | −137.0960 | 1958.3 m | 3.2°      | 80.7 %            |
| 2   | −89.43875 | −137.5480 | 1958.1 m | 1.8°      | 79.5 %            |
| 3   | −89.44309 | −137.7600 | 1956.4 m | 2.0°      | 74.4 %            |
| 4   | −89.45267 | −137.1487 | 1956.4 m | 1.2°      | 82.3 %            |
| 5   | −89.46226 | −137.0875 | 1950.9 m | 2.9°      | 78.1 %            |
| 6   | −89.47394 | −137.3754 | 1948.4 m | 0.9°      | 84.7 %            |
| 7   | −89.49118 | −138.4813 | 1928.7 m | 0.8°      | 76.1 %            |

**Resultado:** las 7 RoIs superan el 70 % (mínimo 74.4 %), en acuerdo con la definición de PGDA. Las RoIs 4 y 6 están entre las mejores (82.3 % y 84.7 %), coherente con _"generally… most favorable"_. La RoI 5 (78.1 %) queda en la media y la RoI 1 también es alta (80.7 %).

**Reproducir:**

- Fixture con SHA-256 y procedencia: `tests/validation/fixtures/pgda_site01_rois.json`.
- Regenerarlo: `uv run --with pyshp python -m tests.validation.tools.fetch_pgda_rois`.
- Test: `tests/validation/test_illumination_pgda.py`. Requiere DEM y se salta en CI.
- El check `illumination_site01_rois_vs_pgda` se publica en `ValidationService.GetReport`.

**Limitaciones y pendientes:**

- La referencia es un umbral (> 70 %), no un valor por RoI: PGDA no publica en texto la cifra exacta de cada región.
- Las tablas numéricas de Mazarico et al. (2011) y Barker et al. (2021) están bajo muro de pago (Elsevier) y no se pudieron leer. La comparación valor a valor sigue pendiente en [#10](https://github.com/PabloVS044/lumen/issues/10).
- Solo Site01. Las RoIs de Site04, 06, 07 y 11 también están publicadas, pero sus DEM de 5 m no se descargan hoy (`prepare_dem.py` de R2 solo baja Site01).
