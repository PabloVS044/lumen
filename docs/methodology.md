# Metodología

Owner: R3 Efemérides/Ciencia. Versión pública y resumida de las secciones 4 y 9 del documento técnico,
para `/about` y la entrega de Space Apps. Se completa a medida que cada algoritmo queda implementado y
validado.

- [ ] Horizonte (9.3): capas, alcance, resolución azimutal, curvatura. _(R2)_
- [ ] Efemérides (9.4): kernels, marco MOON_ME, aberración. _(Fase 7)_
- [ ] Visibilidad (9.5) y umbrales por defecto. _(Fase 7)_
- [ ] Métricas (9.6) y eventos. _(Fase 7)_
- [x] Simulador de energía (9.8) y limitaciones.

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
