# Validación

Owner: R3 Efemérides/Ciencia. Resultados de la sección 14 que alimentan `/validation`.
El motor los sirve en `ValidationService.GetReport` (generado con
`uv run python -m tests.validation.tools.build_report`; un test exige que esté al día).

| Prueba                                                    | Tolerancia               | Estado                                                                               |
| --------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| Sol/Tierra az/el vs JPL Horizons, 5 sitios × 20 instantes | ≤ 0.01°                  | ✅ máx. 5.4e-7° (ver abajo)                                                          |
| Ventanas del eclipse 2026-03-03 vs CSPICE `occult()`      | ≤ 3 min                  | ✅ máx. 1 min (ver abajo)                                                            |
| Horizonte DEM sintético plano                             | 1e-4°                    | pendiente (R2)                                                                       |
| Horizonte montaña analítica                               | exacto                   | pendiente (R2)                                                                       |
| Convergencia paso radial / alcance                        | sin cambio significativo | pendiente (R2)                                                                       |
| % iluminación vs Mazarico 2011 / Barker 2021              | documentar diferencias   | pendiente, requiere horizonte ([#10](https://github.com/PabloVS044/lumen/issues/10)) |

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
