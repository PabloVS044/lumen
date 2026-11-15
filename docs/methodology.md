# Metodología

Owner: R3 Efemérides/Ciencia. Versión pública y resumida de las secciones 4 y 9 del documento técnico,
para `/about` y la entrega de Space Apps. Se completa a medida que cada algoritmo queda implementado y
validado.

- [x] Horizonte (9.3): capas, alcance, resolución azimutal, curvatura. _(R2; validación sintética y convergencia)_
- [x] Efemérides (9.4): kernels, marco MOON_ME, aberración.
- [x] Visibilidad (9.5), eclipses (9.4.4) y umbrales por defecto.
- [x] Métricas (9.6), eventos y score (9.7).
- [x] Simulador de energía (9.8) y limitaciones.
- [x] What-if de retraso (9.9).

Resultados de validación: [validation.md](validation.md) y RPC `ValidationService.GetReport`.

## Terreno y horizonte (secciones 8.1, 9.2 y 9.3)

Código: `services/engine/lumen_engine/{dem,horizon}/` · RPCs `TerrainService.GetCoverage`,
`GetTerrainPoint` y `HorizonService.ComputeHorizon`.

- **Datos instalados:** [PGDA Site01](https://pgda.gsfc.nasa.gov/products/78) de 5 m (LDEM, LDEC y
  pendiente) y [PGDA polar 80S](https://pgda.gsfc.nasa.gov/products/90) de 80 m. El primero se convierte
  a COG; el segundo ya se publica como COG. `data/scripts/prepare_dem.py` genera un índice de capas
  en `data/local/dem/index.json`. Con `--global` añade el JP2 PDS LDEM_128 de ~237 m/píxel como
  respaldo fuera del polo; se aplica su escala PDS de 0.5 m por valor entero. Los rasters no se versionan.
- **Alturas:** metros respecto de la esfera LOLA de 1 737,4 km. La proyección usa una esfera lunar
  propia; no se mezclan coordenadas EPSG terrestres. El muestreo de altura es bilineal y baja a la
  siguiente capa si encuentra NoData. LDEC estima la fracción local de píxeles sin retornos directos.
- **Máscara:** 0,25° de azimut y 200 km de alcance por defecto. Se barre cada rumbo sobre la esfera,
  proyectando al DEM y calculando el ángulo de elevación con curvatura exacta. Los primeros 200 m
  se muestrean cada 1 m para no perder una cresta cercana por el paso de píxel. Site01 usa 5 m hasta
  10 km; fuera de ese alcance usa la capa polar de 80 m. La búsqueda M12 usa 1° y limita la capa
  fina a 2 km antes de refinar los mejores candidatos a 0,25°.
- **Cobertura:** sin una capa válida se devuelve `NO_COVERAGE`; si un rayo no tiene datos en su
  último kilómetro, `INSUFFICIENT_DEM_RANGE`. Fuera del casquete 80–90°S se debe preparar el
  respaldo global con `--global`; su resolución limita el detalle de relieve cercano.
- **Precisión:** las coordenadas de Site01 en el catálogo siguen aproximadas. PGDA publica estos
  GeoTIFF en MOON_ME de DE421; la efeméride usa la realización de DE440. La concordancia entre
  realizaciones y la validación visual externa del perfil siguen pendientes.

El buscador M12 evalúa una malla gruesa, densifica los vecindarios prometedores y devuelve top-K
recalculado con horizonte completo. El mapa de calor asigna a las celdas no evaluadas el valor
del candidato medido más cercano: es exploratorio y no garantiza el óptimo global. Los jobs de
búsqueda se almacenan en memoria del proceso hasta que R1 integre la cola persistente.
La banda experimental de incertidumbre usa los clones oficiales de Site01 para reportar
p5/p50/p95 del horizonte y de las métricas de iluminación, visibilidad y operación cuando se
proporciona una serie de efemérides del sitio.

## Efemérides (sección 9.4)

Código: `services/engine/lumen_engine/ephem/` · RPCs `EphemerisService.GetSeries` y `GetState`.

- **Kernels SPICE** (NAIF, versiones fijadas con SHA-256 en `data/scripts/download_kernels.sh`):
  - `de440s.bsp`: posiciones del Sol, la Tierra y la Luna (1849–2150).
  - `moon_pa_de440_200625.bpc` + `moon_de440_250416.tf`: orientación lunar; `MOON_ME` → `MOON_ME_DE440_ME421`.
  - `naif0012.tls`: conversión UTC ↔ TDB con segundos intercalares.
  - `pck00011.tpc`: radios.
- **Marco:** MOON_ME (Mean Earth/polar axis), el de los productos LOLA. Difiere de MOON_PA en ≈ 0.02886° (≈ 875 m en la superficie).
- **Observador:** sobre la esfera de referencia de LOLA (R = 1 737.4 km) más la altura del terreno (DEM) y la del observador (2 m por defecto).
- **Vertical local:** radial, con base Este-Norte-Arriba propia. En el polo exacto se toma lon = 0 como referencia del norte.
- **Posición aparente:** vector sitio→cuerpo con `spkcpo` y corrección `LT+S` (tiempo de luz + aberración estelar). Sin refracción: la Luna no tiene atmósfera.
- **Azimut:** desde el norte, en sentido horario. Elevación sobre el plano tangente local.
- **Malla temporal:** instantes UTC equiespaciados; rango ≤ 730 días y ≤ 100 000 muestras. Fuera de la cobertura de los kernels → error `OUT_OF_EPHEMERIS_RANGE`.
- **Rendimiento:** un año a paso de 30 min (17 521 instantes, Sol y Tierra) ≈ 1 s.
- **Validación:** coincide con JPL Horizons con error máximo 5.4e-7° y con `azlcpo` de CSPICE a 1e-6°.

## Visibilidad y eclipses (secciones 9.4.4, 9.4.5, 9.5)

Código: `services/engine/lumen_engine/visibility/`.

- **Horizonte:** la máscara de terreno (R2) da la elevación del horizonte por azimut. Para el azimut del Sol o de la Tierra se interpola linealmente entre los vecinos, con continuidad en 360°.
- **Radios angulares:** `asin(R / d)`. Sol ≈ 0.266° (R = 695 700 km); Tierra ≈ 0.95° (R = 6 371 km).
- **Fracción de disco sobre el horizonte:** el horizonte se aproxima como recta dentro del disco.
  - `s = (e − H) / r`.
  - Fracción = área del segmento circular: `(θ − sin θ) / 2π` con `θ = 2·acos(−s)`.
- **Eclipses** (la Tierra tapa al Sol): fracción del disco solar cubierta por el disco terrestre (intersección de dos círculos).
  - Validado contra CSPICE `occult()` en el eclipse del 2026-03-03: bordes a ≤ 1 min.
  - No modela la luz refractada por la atmósfera terrestre.
- **Reglas** (defaults de las decisiones Q6/Q7 de la sección 21):

  | Concepto       | Regla                                                               | Default                                             |
  | -------------- | ------------------------------------------------------------------- | --------------------------------------------------- |
  | Sol visible    | fracción que llega (horizonte × (1 − eclipse)) ≥ `sun_min_fraction` | 0.5 (centro visible); 0 = cualquier parte del disco |
  | Tierra visible | centro de la Tierra ≥ horizonte + `earth_margin_deg`                | 0°                                                  |
  | Operable       | Sol y Tierra visibles a la vez                                      | —                                                   |

## Métricas y eventos (sección 9.6)

Código: `services/engine/lumen_engine/metrics/` · RPC `EphemerisService.ListEvents`.

- **Porcentajes:** fracción de muestras con Sol visible, Tierra visible u operable. `illumination_pct_weighted` promedia la fracción de disco en lugar de un sí/no.
- **Rachas:** la más larga de noche, de comunicación, de apagón y operable, como número de muestras consecutivas × paso.
  - La noche más larga incluye su intervalo; se marca `truncated` si toca el borde del rango, porque podría ser más larga.
- **Energía:** `energy_kwh_per_m2` integra `S0 · fracción · cos(el)` (panel vertical con seguimiento).
- **Eclipse:** `eclipse_hours` cuenta las horas con el Sol parcial o totalmente oculto por la Tierra.
- **Eventos** (sunrise, sunset, earthrise, earthset, inicio y fin de eclipse):
  - Se detectan por cambio de visibilidad entre dos muestras.
  - El instante se refina interpolando linealmente una función de margen que vale 0 en el umbral.
  - Para los contadores "cuánto falta" se busca el primer evento posterior al instante elegido.

## Score para comparar escenarios (sección 9.7)

`score = Σ wᵢ · norm(métricaᵢ) / Σ wᵢ`.

- `norm` es min-max entre los escenarios comparados, invertido en las métricas donde menor es mejor (noche más larga, apagón más largo).
- Pesos por defecto iguales sobre: iluminación, noche más larga, visibilidad de la Tierra, ventana de comunicación y % operable.
- Si todos los escenarios empatan en una métrica, no se penaliza a ninguno.
- La UI muestra siempre las métricas crudas junto al score.

## What-if de retraso (sección 9.9)

Código: `services/engine/lumen_engine/metrics/whatif.py` · RPC `WhatIfService.Evaluate`.

- Las series se calculan una vez para [aterrizaje nominal, nominal + retraso máximo + duración], a paso de 30 min.
- Cada retraso es una ventana deslizante y sus métricas se recalculan completas. Opcionalmente se simula la batería en cada ventana.
- **Recomendados:** retrasos cuyo score (pesos iguales sobre las métricas pedidas) está a ≤ 0.1 del mejor y que sobreviven si se simula batería.
- **Rendimiento:** 61 retrasos, misión de 14 días y batería ≈ 0.3 s.

## Simulador de energía (sección 9.8)

Código: `services/engine/lumen_engine/power/simulator.py` · RPC `PowerService.Simulate`.

### Modelo

- **Irradiancia:** `S0(t) = 1361 W/m² · (1 UA / d_sol(t))²`, con la distancia Sol–sitio de SPICE.
- **Potencia generada:** `P_gen = η · A · S0 · f_sol · g`.
  - `f_sol`: fracción del disco solar que llega al sitio, ya descontados el horizonte y los eclipses.
  - `g` depende de la orientación del panel:

    | Orientación                    | g                                    |
    | ------------------------------ | ------------------------------------ |
    | Vertical con seguimiento       | cos(el)                              |
    | Horizontal                     | sin(max(el, 0))                      |
    | Vertical fijo hacia `az_panel` | max(0, cos(el) · cos(az − az_panel)) |

- **Consumo:** `P_day` mientras llega algo de Sol (`f_sol > 0`); `P_night` (supervivencia) el resto.
- **Batería:**
  - Al cargar se almacena `ΔE · η_b`; al descargar se extrae `ΔE / η_b`.
  - La energía se limita a `[C · (1 − DoD), C]`.
  - Si la batería llega a la reserva y el consumo supera la generación, hay **brownout** (falla de energía).
- **Paso temporal:** el estado en tᵢ se integra con la potencia de tᵢ durante el intervalo [tᵢ, tᵢ₊₁).

### Valores por defecto (preset "lander pequeño" del documento técnico)

| Parámetro                    | Valor                    |
| ---------------------------- | ------------------------ |
| Área de panel                | 2 m²                     |
| Eficiencia (celda + MPPT)    | 0.28                     |
| Orientación                  | vertical con seguimiento |
| Capacidad de batería         | 2 000 Wh                 |
| Carga inicial                | 100 %                    |
| Profundidad de descarga máx. | 80 %                     |
| Consumo de día / de noche    | 150 W / 60 W             |
| Eficiencia de carga/descarga | 0.95                     |

### Salidas

- Series de `P_gen`, `P_load` y `SoC %`.
- `survives`: no hubo brownout. `first_brownout_time`: primer instante en que la batería llegó a la reserva sin cubrir el consumo. `min_soc_pct`.
- `energy_margin_wh`:
  - Sin brownout: energía mínima alcanzada por encima de la reserva.
  - Con brownout: valor **negativo**, igual a la energía que el consumo pidió y la batería no pudo entregar.

### Elección de orientación

El default (vertical con seguimiento, g = cos el) está pensado para **sitios polares**, donde el Sol va
a 0–3° de elevación (sección 4.6). Cerca del ecuador el Sol pasa cerca del cénit y un panel vertical
casi no genera al mediodía: allí conviene un panel horizontal (g = sin el). El simulador no elige la
orientación por el usuario.

### Limitaciones

- No modela **temperatura** (rendimiento de celdas y batería, calentadores de supervivencia).
- No modela **polvo** sobre los paneles ni su degradación en el tiempo, salvo lo incluido en `η`.
- No modela el **sombreado del propio lander** ni de otros elementos cercanos; solo el del terreno.
- No modela **RTG** ni otras fuentes de energía no solares.
- La fracción `f_sol` aproxima el horizonte como una recta dentro del disco solar (sección 9.5).
- Durante un eclipse no modela la luz refractada por la atmósfera terrestre (anillo rojizo).
- Los presets "lander mediano" y "rover" no tienen valores en el documento técnico, así que no están implementados.

### Validación

Tests en `tests/unit/test_power.py`:

- Potencia con Sol pleno para cada orientación (geometría analítica).
- Contabilidad de energía con eficiencias de carga y descarga.
- Brownout en el instante calculado a mano: 1 600 Wh útiles a 60 W / 0.95 se agotan a las 25.3 h.
- Propiedad: sin consumo, la batería nunca se descarga.

Con datos reales, un mes en un sitio ecuatorial con horizonte plano produce brownout durante la noche
lunar de ~14.8 días, como se espera de esos parámetros.
