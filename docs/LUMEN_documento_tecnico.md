# LUMEN — Documento Técnico Maestro

> **Lunar Utility Map for Energy & Networks**
> *"See the light. Keep the link."*
>
> Proyecto para el **NASA International Space Apps Challenge 2026** — Reto: **Lunar Landing Site Navigator**
>
> Versión: 1.0 · Fecha: 2026-11-14 · Estado: Documento base para iniciar desarrollo

---

## Índice

0. [Cómo usar este documento](#0-cómo-usar-este-documento)
1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [El reto: contexto completo](#2-el-reto-contexto-completo)
3. [Evaluación y entrega en Space Apps](#3-evaluación-y-entrega-en-space-apps)
4. [Fundamentos científicos que el equipo debe dominar](#4-fundamentos-científicos-que-el-equipo-debe-dominar)
5. [Usuarios, casos de uso e historias de usuario](#5-usuarios-casos-de-uso-e-historias-de-usuario)
6. [Alcance funcional completo (módulos)](#6-alcance-funcional-completo-módulos)
7. [Arquitectura del sistema](#7-arquitectura-del-sistema)
8. [Fuentes de datos y recursos](#8-fuentes-de-datos-y-recursos)
9. [Algoritmos y modelos de cálculo](#9-algoritmos-y-modelos-de-cálculo)
10. [Especificación de la API del motor](#10-especificación-de-la-api-del-motor)
11. [Modelo de datos, caché y almacenamiento](#11-modelo-de-datos-caché-y-almacenamiento)
12. [Frontend (Next.js): páginas, componentes, estado](#12-frontend-nextjs-páginas-componentes-estado)
13. [Catálogo de sitios curados](#13-catálogo-de-sitios-curados)
14. [Validación científica y pruebas](#14-validación-científica-y-pruebas)
15. [Infraestructura, despliegue y DevOps](#15-infraestructura-despliegue-y-devops)
16. [Organización del equipo, fases y roadmap](#16-organización-del-equipo-fases-y-roadmap)
17. [Riesgos y mitigaciones](#17-riesgos-y-mitigaciones)
18. [Identidad, UX y pitch](#18-identidad-ux-y-pitch)
19. [Glosario](#19-glosario)
20. [Referencias y enlaces](#20-referencias-y-enlaces)
21. [Preguntas abiertas y decisiones pendientes](#21-preguntas-abiertas-y-decisiones-pendientes)
22. [Anexos](#22-anexos)

---

## 0. Cómo usar este documento

- Es la **fuente única de verdad** del proyecto. Cualquier cambio de alcance, arquitectura o algoritmo se refleja aquí primero (PR al archivo `docs/LUMEN_documento_tecnico.md` del repo).
- Los elementos marcados con **⚠️ VERIFICAR** son datos que se tomaron de memoria o de fuentes secundarias y deben confirmarse contra la fuente primaria antes de usarse en producción o en el pitch.
- Los elementos marcados con **🎯 MVP** son obligatorios para tener un producto presentable. **🚀 Ambicioso** son diferenciadores. **🧪 Experimental** son opcionales si sobra tiempo.
- Convenciones:
  - Todas las horas internas en **UTC** (ISO 8601). La UI puede mostrar UTC y hora local del usuario.
  - Ángulos en **grados**; azimut medido **desde el norte, en sentido horario** (N=0°, E=90°, S=180°, W=270°).
  - Longitudes lunares en **este positivo, rango −180° a +180°** en la API (la UI acepta 0–360° y convierte).
  - Latitud sur negativa (polo sur = −90°).
  - Distancias en metros salvo que se indique.
  - Radio lunar de referencia **R = 1 737 400 m** (esfera de referencia de LOLA).

---

## 1. Resumen ejecutivo

**Problema.** Las misiones al polo sur lunar enfrentan condiciones extremas de iluminación y de comunicación con la Tierra. La posición del Sol determina la energía (paneles solares) y la temperatura; la posición de la Tierra determina si hay comunicación directa (Direct-to-Earth, DTE) sin satélites relé. Cerca del polo, el Sol y la Tierra se mueven muy cerca del horizonte, de modo que el relieve local (montañas, bordes de cráter) decide si hay luz o comunicación. Las herramientas existentes (LROC QuickMap, Moon Trek, JPL Horizons) son potentes pero están pensadas para análisis detallado por especialistas y obligan a combinar varias interfaces para evaluar cada combinación sitio-fecha.

**Solución.** **LUMEN** es una plataforma web que, para **cualquier coordenada lunar** (con énfasis en el polo sur) y cualquier rango de fechas, calcula y visualiza:

1. **Visor de horizonte lunar**: gráfico polar azimut/elevación con el perfil real del terreno y las trayectorias del Sol y la Tierra.
2. **Línea de tiempo de energía y comunicación**: heatmap días × horas con filas "Sol visible" y "Tierra visible", resaltando ventanas buenas y los peores apagones.
3. **Comparador de sitios lado a lado** (2–4 sitios) con métricas clave.
4. **Globo lunar 3D interactivo** con sitios marcados, slider temporal que anima el terminador y las posiciones del Sol y la Tierra.

Más diferenciadores: **simulador de energía/batería**, **análisis "what-if" de retrasos**, **buscador del mejor punto cercano**, **escenarios compartibles por URL**, **modo Planner vs modo Explorar (educativo)**, **exportación** y **página de validación científica**.

**Clave técnica.** Un **motor de cálculo en Python** ("LUMEN Engine") que:
- calcula la **máscara de horizonte** por ray-casting sobre los modelos de elevación (DEM) de LOLA,
- calcula **efemérides** del Sol y la Tierra desde el sitio con **SPICE** (kernels DE440),
- cruza ambos para obtener visibilidad (incluida fracción visible del disco), métricas y simulaciones,
- expone todo vía API REST consumida por un **frontend Next.js**.

---

## 2. El reto: contexto completo

### 2.1 Datos del reto

| Campo | Valor |
|---|---|
| Evento | NASA International Space Apps Challenge 2026 |
| Reto | Lunar Landing Site Navigator |
| URL | https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/ |
| Dificultad | Advanced / Intermediate |
| Temas | Human Exploration, Moon, Software, Space Exploration |

### 2.2 Enunciado (resumen fiel en español)

Las misiones al polo sur de la Luna enfrentan restricciones extremas de iluminación y comunicación, y su planificación requiere coordinación entre equipos de ciencia e ingeniería. Ya existen herramientas para determinar las posiciones del Sol y la Tierra en sitios candidatos, pero sus interfaces complicadas dificultan evaluar la información crítica con eficiencia. **El reto es crear una herramienta o aplicación intuitiva que permita a planificadores de misión, educadores y al público comparar sitios de aterrizaje y fechas rápidamente, visualizando las posiciones del Sol y la Tierra respecto al horizonte para evaluar el potencial de generación de energía y las ventanas de comunicación directa con la Tierra.**

### 2.3 Antecedentes (resumen)

- El programa **CLPS (Commercial Lunar Payload Services)** de NASA y otras misiones dependen de escoger sitios y fechas que equilibren necesidades científicas e ingenieriles.
- Uno de los mayores desafíos es entender el **entorno local de iluminación y comunicación**:
  - **Sol** → energía para paneles solares y condiciones térmicas.
  - **Tierra** → posibilidad de comunicación directa sin satélites relé.
- El **polo sur** es especialmente difícil: hay hielo de agua y recursos de alto valor científico, pero su geometría produce **variaciones extremas** de iluminación y visibilidad de la Tierra entre distintos días lunares y estaciones. **Cambios pequeños de ubicación o fecha pueden cambiar drásticamente** la energía disponible y las ventanas de comunicación.
- En la práctica, las misiones **rara vez mantienen su calendario**: problemas de hardware o retrasos de lanzamiento obligan a reconsiderar fecha y sitio. Los ingenieros necesitan evaluar rápido **sitios alternativos en la misma región** o **fechas alternativas en el mismo sitio**.
- Herramientas como **Quickmap, Moon Trek y JPL Horizons** están hechas para análisis detallado y son difíciles de usar para comparar escenarios rápidamente; evaluar cada combinación sitio-fecha implica navegar varias interfaces e interpretar datos crudos. Existe una **brecha** entre los datos técnicos disponibles y herramientas accesibles para planificación ágil.

### 2.4 Objetivos sugeridos por el reto (todos deben quedar cubiertos por LUMEN)

| # | Objetivo del reto | Cómo lo cubre LUMEN | Módulo |
|---|---|---|---|
| O1 | **Selección y comparación interactiva de sitios**: lista curada (Apollo, objetivos CLPS, misiones comerciales, programas de otros países) + **coordenadas personalizadas** + comparación lado a lado o secuencial | Catálogo curado + entrada libre de coordenadas + comparador 2–4 sitios | M1, M5, M6 |
| O2 | **Flexibilidad de fecha y hora**: elegir fecha/hora de aterrizaje y explorar cambios entre días lunares y estaciones | Selector de rango temporal, slider, heatmap multi-lunación, what-if de retraso | M3, M4, M9 |
| O3 | **Visualización de posición del Sol y la Tierra** respecto al horizonte en una fecha; **tiempo restante hasta sunset / Earthset** | Visor polar de horizonte + contadores de sunset/Earthset | M2, M7 |
| O4 | **Evaluación de energía y comunicación**: elevación solar, duración de luz, ventanas de visibilidad de la Tierra | Panel de métricas, heatmap, simulador de batería | M3, M7, M8 |
| O5 | **Múltiples enfoques de visualización**: mapas 2D, superficies 3D u otros | Globo 3D, polar 2D, heatmap, vista de terreno local 3D | M2, M3, M4, M10 |
| O6 | **Dinámica temporal**: animaciones o líneas de tiempo de cómo cambian las posiciones a lo largo de un día lunar o varios días | Slider animado, reproducción temporal, heatmap | M3, M4 |
| O7 | **Accesible a todos los niveles**: planificadores técnicos + educadores + público | Modo Planner y modo Explorar, tooltips explicativos, tours guiados | M11 |

El reto también indica que la solución puede ser web app, app móvil, visualización interactiva, juego educativo u otro formato, siempre que la evaluación rápida de sitios sea clara y eficiente. **LUMEN será una aplicación web responsiva.**

### 2.5 Consideraciones potenciales del reto (checklist)

**Enfoque técnico**
- [ ] Efemérides con **JPL Horizons** o **datasets precalculados** → usamos SPICE (mismos datos DE440 que Horizons) y validamos contra Horizons.
- [ ] **Topografía LOLA** para superficie realista y cálculo preciso del horizonte.
- [ ] **Sin atmósfera, no hay refracción**: el horizonte lo define el terreno local y el borde de la esfera lunar vista desde el sitio.
- [ ] **Elevación solar** como métrica clave de generación de energía, mostrada de forma prominente.

**Experiencia de usuario**
- [ ] Priorizar la **comparación rápida de escenarios** (múltiples combinaciones sitio-fecha).
- [ ] Comunicar claramente el **tiempo restante hasta sunset o Earthset** (información operativa crítica).
- [ ] Hacer evidentes las **diferencias extremas** entre condiciones lunares y terrestres.
- [ ] Ayudar a entender **por qué cambios pequeños** de ubicación o fecha tienen gran impacto.

**Datos y precisión**
- [ ] Tener en cuenta la **topografía real** (afecta mucho el horizonte y las ventanas).
- [ ] Considerar la **libración** de la Tierra (su "bamboleo" visto desde la Luna) y las variaciones orbitales.
- [ ] Representar **pendientes fuertes y cráteres profundos** que crean sombras extremas.

**Engagement e impacto**
- [ ] Apoyar la coordinación entre equipos de ciencia e ingeniería.
- [ ] Responder rápido a cambios de calendario o de hardware.
- [ ] Servir como herramienta educativa sobre por qué la planificación lunar es compleja.

### 2.6 Recursos oficiales listados en el reto

**NASA Data & Resources**

| Recurso | URL | Para qué lo usamos |
|---|---|---|
| **LROC QuickMap** (Arizona State University) | https://quickmap.lroc.asu.edu/ | Imágenes de alta resolución, topografía y capas del LRO. Exploración de sitios, verificación de coordenadas, referencia visual de la topografía del polo sur. |
| **Moon Trek** (NASA) | https://trek.nasa.gov/moon/ | Visualización 3D interactiva; referencia de UX para el globo; consulta de topografía y capas. |
| **JPL Horizons System** | https://ssd.jpl.nasa.gov/horizons/ (API: https://ssd-api.jpl.nasa.gov/doc/horizons.html) | Efemérides de Sol y Tierra vistos desde cualquier punto de la Luna. **Validación** de nuestro motor SPICE y posible fallback. |

**Space Agency Partner Resources**

| Recurso | URL | Para qué lo usamos |
|---|---|---|
| **CSA – Moon Exploration** (Agencia Espacial Canadiense) | https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/ | Contexto de misiones lunares y contribuciones canadienses a Artemis; contenido para el modo Explorar y para mencionar uso de recursos de agencia socia en la entrega. |

> Nota del reto: NASA no respalda entidades no gubernamentales de EE. UU. y, para sitios no gubernamentales, los participantes deben cumplir los parámetros de uso de datos de cada sitio. → Revisar licencias de cada dataset externo (sección 8).

---

## 3. Evaluación y entrega en Space Apps

### 3.1 Criterios de evaluación (⚠️ VERIFICAR en la Participant Guide 2026)

En ediciones anteriores, Space Apps evaluó con cinco criterios de peso similar. Diseñamos LUMEN para maximizar cada uno:

| Criterio | Qué buscan | Cómo lo ataca LUMEN |
|---|---|---|
| **Influence / Impact** | Potencial de impacto real | Resolver el caso de "la misión se retrasó, ¿y ahora?"; utilidad para CLPS/Artemis; valor educativo |
| **Creativity** | Originalidad | Simulador de batería, fracción de disco visible, buscador de mejor punto, "what-if" de retrasos, modo Explorar |
| **Validity** | Rigor científico / técnico | Horizonte real desde LOLA, SPICE DE440, página de validación contra Horizons y mapas publicados |
| **Relevance** | Responde al reto | Cubre explícitamente O1–O7 y todas las consideraciones (tabla 2.4/2.5) |
| **Presentation** | Calidad de la presentación | Demo pulida, video claro, narrativa, identidad visual fuerte |

### 3.2 Requisitos de entrega (⚠️ VERIFICAR formato exacto 2026)

Típicamente la página del proyecto en Space Apps incluye:
- Título y resumen de alto nivel del proyecto.
- **Demo del proyecto**: video corto (históricamente ≤ 30 s) **o** presentación (históricamente ≤ 7 diapositivas). ⚠️ VERIFICAR
- **Enlace final del proyecto** (repositorio público y/o demo en vivo).
- Descripción detallada: qué hace, cómo funciona, beneficios, herramientas/lenguajes usados.
- **Uso de datos de NASA** (explícito: Horizons, LOLA, LRO/QuickMap, Moon Trek).
- **Uso de datos de agencias socias** (CSA).
- Referencias.
- **Declaración de uso de IA** (en ediciones recientes se exigió declarar el uso de herramientas de IA y no usar IA para generar imágenes/marcas de NASA). ⚠️ VERIFICAR
- No usar el logo/insignia de NASA en la marca del proyecto.

**Acción:** una persona del equipo lee la Participant Guide y FAQs (https://www.spaceappschallenge.org/resources/) y actualiza esta sección en el día 1.

---

## 4. Fundamentos científicos que el equipo debe dominar

Esta sección es obligatoria para todo el equipo, especialmente para quien trabaje en el motor.

### 4.1 Por qué el polo sur es extremo

- El eje de rotación de la Luna está inclinado solo **~1.54°** respecto a la eclíptica. Por eso, en los polos el Sol **nunca sube mucho**: su elevación en el polo oscila aproximadamente entre −1.5° y +1.5° a lo largo del año (más el efecto de la latitud del sitio: un sitio a 89°S ve el Sol hasta ~1°+1.5° más arriba en el "lado" favorable).
- Con el Sol rozando el horizonte, **una montaña a decenas de km** puede tapar el Sol, y un **pico o borde de cráter** puede recibir luz casi continua (los llamados "**picos de luz casi eterna**").
- Al revés, el fondo de cráteres profundos queda en **sombra permanente** (**PSR, Permanently Shadowed Regions**), con temperaturas que permiten conservar hielo de agua. Por eso son científicamente valiosos, pero sin energía solar.
- La Luna rota una vez por **mes sinódico (~29.53 días)**: un "día lunar" dura ~29.5 días terrestres. En el polo, el Sol da una vuelta completa al horizonte (360° de azimut) en ese periodo.
- Las **estaciones lunares** (debidas a la inclinación de 1.54°) cambian la elevación máxima del Sol a lo largo del **año de eclipses (~346.6 días)**. ⚠️ VERIFICAR: el ciclo relevante de iluminación polar se relaciona con el año draconítico/de eclipses; documentar con fuente al escribir la sección educativa.

### 4.2 La Tierra vista desde la Luna

- La Luna tiene **rotación síncrona**: muestra casi siempre la misma cara a la Tierra. Desde un punto fijo de la cara visible, la Tierra **casi no se mueve** en el cielo: describe una pequeña figura por la **libración**.
- **Libración en longitud** ≈ ±7.9° (por la excentricidad de la órbita) y **libración en latitud** ≈ ±6.7° (por la inclinación). ⚠️ VERIFICAR valores exactos.
- Consecuencia en el polo sur: la Tierra está **cerca del horizonte norte** del sitio y su elevación oscila varios grados con un periodo de ~27.2 días (mes draconítico) → **la comunicación directa aparece y desaparece** según la libración y el relieve hacia el norte.
- En la **cara oculta** la Tierra nunca es visible (excepto en franjas del limbo que la libración muestra a veces). Mensaje educativo potente.
- **Diámetro angular de la Tierra** vista desde la Luna ≈ **1.9°** (≈ 3.7 veces el del Sol). **Diámetro angular del Sol** ≈ **0.53°**.

### 4.3 Horizonte sin atmósfera

- Sin atmósfera **no hay refracción**: la elevación geométrica es la observada.
- El horizonte "astronómico" para un observador a altura `h` sobre una esfera de radio `R` está **por debajo de 0°** (depresión del horizonte):
  - `dip ≈ acos(R / (R + h))` → para h = 2 m: ≈ 0.0027°; para h = 1000 m (un pico): ≈ 1.95°.
  - Esto significa que en un **pico alto** se puede ver el Sol aunque esté "bajo el horizonte" matemático: es parte de por qué los picos están iluminados.
- La **curvatura** también hace que el terreno lejano "caiga": un objeto a distancia `d` aparece más bajo en `≈ d² / (2R)`. A 100 km: ~2 878 m de caída. Por eso el cálculo de horizonte **debe incluir curvatura**.
- El horizonte real = máximo, para cada azimut, del ángulo de elevación del terreno visto desde el observador.

### 4.4 Visibilidad parcial de discos

- El Sol no es un punto: si el horizonte corta el disco, solo una **fracción** llega a los paneles. A elevaciones de ~1°, esto importa.
- La Tierra (~1.9°) puede estar **parcialmente** sobre el horizonte; para comunicación se suele exigir que el centro (o una fracción mínima) esté visible con cierto margen. Definimos umbrales configurables (sección 9.5).

### 4.5 Eclipses

- Desde la Luna, un **eclipse lunar** (visto desde la Tierra) es un **eclipse de Sol por la Tierra**: el Sol queda oculto tras la Tierra hasta varias horas → **caída de energía** aunque el horizonte esté despejado. El motor debe detectarlo (ocultación Sol–Tierra, sección 9.4.4).

### 4.6 Energía solar en el polo

- Constante solar ≈ **1361 W/m²** a 1 UA; varía con la distancia Sol–Luna (~±3.4% en el año).
- Con el Sol a ~0–3° de elevación, un **panel horizontal** recibe casi nada (∝ sin(el)). Por eso en los polos se usan **paneles verticales** que siguen al Sol en azimut (∝ cos(el) ≈ 1).
- El simulador de LUMEN modela ambas configuraciones (sección 9.8).

### 4.7 Sistemas de referencia (importante para no equivocarse)

- **MOON_PA** (Principal Axes) y **MOON_ME** (Mean Earth / polar axis): dos marcos fijos a la Luna; difieren por una rotación constante pequeña (del orden de cientos de metros en la superficie). ⚠️ VERIFICAR magnitud.
- **Los productos de LOLA y las coordenadas de sitios se publican en MOON_ME** (los DEMs polares de PGDA indican MOON_ME basado en DE421).
- **Todo el motor trabaja en MOON_ME.** Las efemérides se calculan con el PCK DE440 + frame kernel que define MOON_ME para DE440. La diferencia entre MOON_ME de DE421 y de DE440 es pequeña (metros); documentar y considerar despreciable para nuestro propósito.
- **Proyección estereográfica polar sur** (la de los DEMs LOLA polares):
  `+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs`
  ⚠️ VERIFICAR contra el header/README de cada GeoTIFF (algunos productos usan lat_ts o factor de escala distinto).

### 4.8 Cifras de referencia rápida

| Magnitud | Valor |
|---|---|
| Radio medio lunar (referencia LOLA) | 1 737.4 km |
| Mes sinódico (día lunar) | 29.53 días |
| Mes sideral | 27.32 días |
| Mes draconítico | 27.21 días |
| Inclinación del eje lunar respecto a la eclíptica | ~1.54° |
| Distancia media Tierra–Luna | ~384 400 km |
| Diámetro angular de la Tierra desde la Luna | ~1.9° |
| Diámetro angular del Sol | ~0.53° |
| Constante solar a 1 UA | ~1361 W/m² |
| Retraso de luz Tierra–Luna | ~1.28 s |

---

## 5. Usuarios, casos de uso e historias de usuario

### 5.1 Personas

| Persona | Necesidad | Nivel |
|---|---|---|
| **Planificadora de misión** (ingeniera de sistemas CLPS) | Evaluar rápido sitios/fechas alternativos tras un retraso; números exactos; exportar | Experta |
| **Científico de la misión** | Equilibrar objetivo científico (cerca de PSR) con viabilidad de energía/comunicación | Experto |
| **Ingeniero de energía/comunicaciones** | Perfil de potencia, duración de noches, ventanas DTE continuas | Experto |
| **Educador / docente** | Explicar por qué el polo sur es difícil; demostraciones visuales | Intermedio |
| **Estudiante / público curioso** | Explorar, entender, "jugar" con fechas y lugares | Básico |
| **Juez del hackathon** | Entender el valor en < 1 minuto | Mixto |

### 5.2 Casos de uso principales

1. **CU-01 Evaluar un sitio**: elegir sitio (catálogo o coordenadas), rango de fechas → ver horizonte, timeline, métricas.
2. **CU-02 Comparar sitios**: elegir 2–4 sitios y un mismo rango → tabla y gráficos comparativos, ganador por métrica.
3. **CU-03 Comparar fechas en un sitio** ("la misión se retrasó"): mismo sitio, 2–4 fechas de aterrizaje → comparar.
4. **CU-04 Encontrar el mejor punto cercano**: desde un sitio, buscar en radio X km el punto con mejor métrica.
5. **CU-05 Simular la misión**: configurar lander (paneles, batería, consumo, duración) → ¿sobrevive? ¿cuándo se queda sin energía?
6. **CU-06 Explorar en 3D**: navegar el globo, ver el terminador animado, hacer clic en sitios.
7. **CU-07 Compartir escenario**: copiar URL con todo el estado; otra persona ve lo mismo.
8. **CU-08 Exportar**: CSV/JSON de series y métricas; reporte PDF de sitio.
9. **CU-09 Aprender**: tour guiado del modo Explorar ("¿por qué hay picos con luz casi eterna?").
10. **CU-10 Saber cuánto falta**: en un instante seleccionado, ver tiempo hasta el próximo sunset y Earthset (y sunrise/Earthrise).

### 5.3 Historias de usuario con criterios de aceptación

> Formato: Como [persona], quiero [acción], para [beneficio]. **AC** = criterios de aceptación.

**HU-01 (🎯 MVP)** Como planificadora, quiero ingresar coordenadas lat/lon arbitrarias, para evaluar cualquier punto.
- AC1: Acepta lat ∈ [−90, 90], lon ∈ [−180, 360) (normaliza a [−180, 180)).
- AC2: Acepta formatos decimal y DMS (`89°27'S 222°41'E`) y valida con mensaje claro.
- AC3: Permite elegir el punto haciendo clic en el globo o en el mapa polar 2D.
- AC4: Muestra la cobertura y resolución de DEM disponible para ese punto antes de calcular.

**HU-02 (🎯 MVP)** Como planificadora, quiero ver el horizonte del sitio con las trayectorias del Sol y la Tierra en un gráfico polar, para saber de un vistazo si el relieve bloquea luz o comunicación.
- AC1: Perfil de horizonte 360° sombreado (terreno).
- AC2: Trayectoria del Sol y de la Tierra en el rango elegido, coloreadas según visible/oculto.
- AC3: Marcador de la posición en el instante seleccionado, con tamaño angular real (opcional, toggle).
- AC4: Tooltip con azimut, elevación del cuerpo y del horizonte, margen (cuerpo − horizonte).
- AC5: Opción de vista "desplegada" (cartesiana azimut vs elevación) con zoom vertical (crítico porque todo pasa entre −2° y +8°).

**HU-03 (🎯 MVP)** Como ingeniero, quiero un heatmap días × horas de Sol visible y Tierra visible, para identificar ventanas y apagones.
- AC1: Dos filas/paneles: Sol, Tierra; (🚀 tercera: "Operable" = Sol ∧ Tierra).
- AC2: Verde = visible, rojo = no visible, intensidad = fracción visible.
- AC3: Resaltado de la **racha de oscuridad más larga** y del **apagón de comunicación más largo**.
- AC4: Clic en una celda → mueve el instante seleccionado global.

**HU-04 (🎯 MVP)** Como planificadora, quiero comparar 2–4 sitios con las mismas métricas, para elegir.
- AC1: Tabla con: % iluminación, racha de oscuridad más larga, horas de Tierra visible, ventana de comunicación continua más larga, elevación solar media/máxima, % operable.
- AC2: Resalta el mejor valor por fila.
- AC3: Mini-heatmaps y mini-polares por sitio en columnas.
- AC4: Los sitios pueden tener **fechas distintas** (modo CU-03).

**HU-05 (🎯 MVP)** Como público, quiero un globo 3D con sitios del polo sur y un slider de fecha que anime el terminador y las posiciones del Sol y la Tierra.
- AC1: Globo con terreno/imagen real; marcadores de sitios curados y personalizados.
- AC2: Slider de tiempo + botón play con velocidades (1 h/s, 6 h/s, 1 día/s).
- AC3: Iluminación de escena orientada según la dirección real del Sol en el instante.
- AC4: Indicadores de dirección al Sol y a la Tierra desde el sitio seleccionado.
- AC5: Clic en sitio → abre panel de detalle.

**HU-06 (🎯 MVP)** Como ingeniero, quiero ver cuánto falta para el próximo sunset y Earthset desde un instante, para operaciones.
- AC1: Contadores "Próximo ocaso solar en X d Y h", "Próxima pérdida de Tierra en …", y sus contrapartes de salida.
- AC2: Si el cuerpo está oculto, muestra "Próxima salida en …".

**HU-07 (🚀)** Como ingeniero de energía, quiero simular la batería de mi lander, para saber si sobrevive.
- AC1: Parámetros: área de panel, eficiencia, orientación (vertical con seguimiento / horizontal / fija con azimut), capacidad de batería (Wh), estado de carga inicial, consumo día/noche (W), profundidad máxima de descarga.
- AC2: Gráfico de SoC vs tiempo, potencia generada vs consumida.
- AC3: Resultado: sobrevive / se agota en fecha X; mínimo SoC.
- AC4: Presets (lander pequeño, mediano, rover).

**HU-08 (🚀)** Como planificadora, quiero un análisis "what-if" de retraso, para saber qué pierdo si aterrizo N días después.
- AC1: Entrada: fecha nominal, rango de retraso (p. ej., 0–60 días), duración de misión.
- AC2: Gráfico de métrica (ej. % iluminación, racha oscura máxima) vs retraso.
- AC3: Marca de "fechas recomendadas".

**HU-09 (🚀)** Como científico, quiero buscar el mejor punto dentro de un radio, para ajustar el sitio.
- AC1: Radio configurable (0.5–20 km), métrica objetivo, restricción de pendiente máxima.
- AC2: Mapa de calor de la métrica en el área + top 5 puntos.
- AC3: "Agregar al comparador" desde un resultado.

**HU-10 (🚀)** Como cualquier usuario, quiero compartir un escenario por URL.
- AC1: Toda la configuración (sitios, fechas, vista, parámetros) está en la URL.
- AC2: Abrir el enlace reproduce exactamente la vista.

**HU-11 (🚀)** Como educador, quiero un modo Explorar con explicaciones y tours guiados.
- AC1: Toggle Planner/Explorar.
- AC2: Al menos 3 tours: "Picos de luz casi eterna", "¿Por qué la Tierra sube y baja?", "Un día lunar en 30 segundos".
- AC3: Comparación Tierra vs Luna (ej. "en tu ciudad el Sol sube a 60°, aquí a 1.5°").

**HU-12 (🚀)** Como planificadora, quiero exportar resultados.
- AC1: CSV/JSON de series temporales y métricas.
- AC2: PNG/SVG de cada gráfico.
- AC3: Reporte PDF de sitio con todos los gráficos y métricas.

**HU-13 (🚀)** Como juez/usuario técnico, quiero una página de validación, para confiar en los números.
- AC1: Comparación de elevación/azimut del Sol y la Tierra contra JPL Horizons (tabla de errores).
- AC2: Comparación de % de iluminación contra mapas publicados (LOLA/PGDA) para sitios conocidos.
- AC3: Descripción de metodología y limitaciones.

---

## 6. Alcance funcional completo (módulos)

| ID | Módulo | Prioridad | Descripción |
|---|---|---|---|
| M1 | **Selector de sitio** | 🎯 | Catálogo curado con búsqueda y filtros (país, programa, estado), coordenadas personalizadas, clic en mapa/globo, sitios guardados en sesión |
| M2 | **Visor de horizonte (polar)** | 🎯 | Idea 1. Polar azimut/elevación + vista desplegada |
| M3 | **Timeline energía/comunicación (heatmap)** | 🎯 | Idea 2. Días × horas, filas Sol/Tierra/Operable |
| M4 | **Globo 3D** | 🎯 | Idea 4. Cesium, terminador, slider, marcadores |
| M5 | **Comparador de sitios** | 🎯 | Idea 3. 2–4 sitios, métricas |
| M6 | **Comparador de fechas** | 🎯 | Mismo sitio, varias fechas (caso "retraso") |
| M7 | **Panel de métricas y contadores** | 🎯 | Métricas + tiempo a sunset/Earthset |
| M8 | **Simulador de energía/batería** | 🚀 | HU-07 |
| M9 | **What-if de retraso** | 🚀 | HU-08 |
| M10 | **Vista de terreno local 3D** | 🚀 | Terreno alrededor del sitio con sombra en el instante (Cesium o three.js) |
| M11 | **Modo Explorar + tours** | 🚀 | HU-11 |
| M12 | **Buscador de mejor punto** | 🚀 | HU-09 |
| M13 | **Escenarios compartibles** | 🚀 | HU-10 |
| M14 | **Exportación** | 🚀 | HU-12 |
| M15 | **Página de validación y metodología** | 🚀 | HU-13 |
| M16 | **Mapa 2D polar de iluminación regional** | 🧪 | Capa de % iluminación/visibilidad de Tierra en una región (precalculada) |
| M17 | **Internacionalización (ES/EN)** | 🧪 | i18n de la UI; pitch en inglés |
| M18 | **Vista "cielo desde el sitio"** | 🧪 | Panorama 360° tipo planetario con horizonte, Sol, Tierra y estrellas |
| M19 | **API pública documentada** | 🧪 | OpenAPI/Swagger público para que otros la usen |

### 6.1 Flujo principal de navegación

```
Landing (/)  ──►  Explorador (/explore)
                   ├─ Globo 3D (centro)
                   ├─ Panel lateral: selector de sitio + rango de fechas
                   └─ Al elegir sitio → Detalle de sitio (/site/[id] o /site?lat&lon)
                         ├─ Pestaña Horizonte (M2)
                         ├─ Pestaña Timeline (M3)
                         ├─ Pestaña Métricas y contadores (M7)
                         ├─ Pestaña Energía (M8)
                         ├─ Pestaña What-if (M9)
                         ├─ Pestaña Terreno 3D (M10)
                         └─ Botón "Agregar a comparar"
                 Comparador (/compare?...) (M5/M6)
                 Mejor punto (/search?...) (M12)
                 Aprender (/learn) (M11)
                 Validación (/validation) (M15)
                 Acerca de / Metodología (/about)
```

### 6.2 Estado global compartido

- `selectedSites[]` (1–4): `{id?, name, lat, lon, heightAboveGround}`
- `timeRange`: `{start, end, stepMinutes}`
- `currentTime` (instante seleccionado, sincronizado entre todas las vistas)
- `mode`: `planner | explore`
- `thresholds`: umbrales de visibilidad (sección 9.5)
- `powerConfig` (M8)
- Toda la vista se sincroniza: mover el slider en el globo mueve el marcador en el polar y la línea vertical en el heatmap.

---

## 7. Arquitectura del sistema

### 7.1 Vista general

```
┌──────────────────────────────────────────────────────────────────┐
│                         Navegador (cliente)                      │
│  Next.js (App Router, React, TypeScript)                         │
│  ├─ CesiumJS/Resium (globo 3D)                                   │
│  ├─ D3 / visx (polar horizonte)  ·  ECharts (heatmap, series)    │
│  ├─ TanStack Query (fetch/caché)  ·  nuqs (estado en URL)        │
│  └─ Zustand (estado UI)                                          │
└──────────────┬───────────────────────────────────────────────────┘
               │ HTTPS (REST/JSON)
┌──────────────▼───────────────────────────────────────────────────┐
│  Next.js server (Route Handlers /api/*) — BFF opcional           │
│  - Proxy al motor, rate limiting, ocultar URL interna            │
└──────────────┬───────────────────────────────────────────────────┘
               │ HTTP interno
┌──────────────▼───────────────────────────────────────────────────┐
│  LUMEN Engine (Python 3.12, FastAPI)                             │
│  ├─ horizon/   : ray-casting sobre DEM (numpy + numba)           │
│  ├─ ephem/     : SPICE (spiceypy), kernels DE440                 │
│  ├─ visibility/: cruce horizonte × efemérides, fracción de disco │
│  ├─ metrics/   : rachas, ventanas, estadísticas                  │
│  ├─ power/     : simulador de batería                            │
│  ├─ search/    : buscador de mejor punto                         │
│  ├─ dem/       : acceso a COG, mosaico multi-resolución          │
│  └─ jobs/      : cola de trabajos (arq/RQ + Redis)               │
└───┬───────────────────┬──────────────────────┬───────────────────┘
    │                   │                      │
┌───▼────┐        ┌─────▼──────┐        ┌──────▼─────────────────┐
│ Redis  │        │ PostgreSQL │        │ Object storage (S3/R2) │
│ jobs + │        │ resultados │        │ DEMs como COG,         │
│ caché  │        │ + catálogo │        │ máscaras precalculadas │
└────────┘        └────────────┘        └────────────────────────┘
```

### 7.2 Decisiones de arquitectura (ADR resumidas)

| # | Decisión | Alternativas | Razón |
|---|---|---|---|
| ADR-01 | Frontend **Next.js + TypeScript** | Vite+React | Decisión del equipo; SSR para landing/SEO, route handlers como BFF |
| ADR-02 | Motor en **Python + FastAPI** | Node/TS, Rust | Ecosistema científico (spiceypy, rasterio, numpy, numba); FastAPI genera OpenAPI automáticamente |
| ADR-03 | Efemérides con **SPICE (spiceypy)** local | Llamar a Horizons en cada request | Sin dependencia externa en runtime, rápido, vectorizable; Horizons se usa para **validar** |
| ADR-04 | DEMs como **Cloud-Optimized GeoTIFF** en object storage | Archivos locales enteros | Lectura por ventanas vía HTTP range; no hace falta descargar GB |
| ADR-05 | Cálculo de horizonte **en el motor**, no en el navegador | WebAssembly en cliente | Requiere leer cientos de MB de DEM; mejor en servidor con caché |
| ADR-06 | **Asíncrono con jobs** para sitios nuevos | Síncrono | Un horizonte nuevo puede tardar segundos; la UI muestra progreso |
| ADR-07 | **Separar horizonte de efemérides** en la caché | Cachear todo junto | La máscara depende solo de (lat, lon, altura); se reutiliza para cualquier rango de fechas |
| ADR-08 | Globo con **CesiumJS + Cesium Moon (3D Tiles)** | three.js con texturas | Terreno real de alta resolución en polos ya listo; three.js queda como fallback |
| ADR-09 | Tipos compartidos generados desde **OpenAPI** (`openapi-typescript`) | Escribir a mano | Evita desincronización front/back |
| ADR-10 | **Monorepo** (pnpm workspaces + carpeta Python con uv) | Repos separados | Un solo lugar, CI unificado |

### 7.3 Stack detallado

**Frontend (`apps/web`)**
- Next.js (App Router, versión estable actual), React, TypeScript estricto.
- Estilos: Tailwind CSS + shadcn/ui (componentes accesibles) + lucide-react (íconos).
- 3D: `cesium` + `resium`. (Fallback 🧪: `three` + `@react-three/fiber` + `@react-three/drei`.)
- Gráficos: D3 (polar personalizado), ECharts (`echarts-for-react`) para heatmap y series. Alternativa: visx.
- Estado: Zustand (UI), `nuqs` (estado en query string), TanStack Query (datos del servidor).
- Formularios/validación: `react-hook-form` + `zod`.
- Fechas: `date-fns` + `date-fns-tz` (o Temporal polyfill), siempre UTC internamente.
- PDF: `@react-pdf/renderer` o generación server-side en el motor (WeasyPrint).
- i18n (🧪): `next-intl`.
- Tests: Vitest + Testing Library; E2E Playwright.

**Motor (`services/engine`)**
- Python 3.12, gestor **uv**.
- FastAPI + Uvicorn (+ Gunicorn en prod), Pydantic v2.
- `spiceypy` (SPICE), `numpy`, `numba` (JIT para ray-casting), `scipy` (interpolación).
- `rasterio` (GDAL) para leer COG; `pyproj` para proyecciones lunares.
- `skyfield` (opcional, para cross-check).
- `arq` o `rq` + Redis para jobs; `redis-py`.
- `SQLAlchemy` + `psycopg` (o `asyncpg`) + Alembic.
- `orjson` para serialización rápida; opcionalmente `msgpack` o arrays binarios para series grandes.
- Tests: `pytest`, `hypothesis` (pruebas de propiedades), `pytest-benchmark`.
- Lint/format: `ruff`, `mypy`.

**Datos (`data/`)**
- Scripts de descarga y conversión (GDAL: `gdal_translate -of COG`, `gdalbuildvrt`).
- Scripts de descarga de kernels SPICE.
- Notebooks de exploración (Jupyter).

### 7.4 Estructura del monorepo

```
lumen/
├─ apps/
│  └─ web/                      # Next.js
│     ├─ app/
│     │  ├─ (marketing)/page.tsx          # landing
│     │  ├─ explore/page.tsx
│     │  ├─ site/page.tsx                 # ?lat=&lon=  o  /site/[id]
│     │  ├─ compare/page.tsx
│     │  ├─ search/page.tsx
│     │  ├─ learn/page.tsx
│     │  ├─ validation/page.tsx
│     │  ├─ about/page.tsx
│     │  └─ api/engine/[...path]/route.ts # proxy BFF
│     ├─ components/
│     │  ├─ globe/              # Cesium
│     │  ├─ horizon/            # polar + desplegado
│     │  ├─ timeline/           # heatmap
│     │  ├─ compare/
│     │  ├─ metrics/
│     │  ├─ power/
│     │  ├─ whatif/
│     │  ├─ site-picker/
│     │  ├─ time-controls/
│     │  └─ ui/                 # shadcn
│     ├─ lib/ (api client, formatters, units, coords)
│     ├─ stores/
│     └─ public/cesium/         # assets estáticos de Cesium
├─ services/
│  └─ engine/
│     ├─ lumen_engine/
│     │  ├─ api/                # routers FastAPI
│     │  ├─ core/               # config, logging
│     │  ├─ dem/
│     │  ├─ horizon/
│     │  ├─ ephem/
│     │  ├─ visibility/
│     │  ├─ metrics/
│     │  ├─ power/
│     │  ├─ search/
│     │  ├─ jobs/
│     │  ├─ catalog/            # sitios curados (YAML/JSON)
│     │  └─ db/
│     ├─ kernels/               # SPICE (descargados en build)
│     ├─ tests/
│     ├─ pyproject.toml
│     └─ Dockerfile
├─ packages/
│  └─ types/                    # TS generado desde OpenAPI
├─ data/
│  ├─ scripts/                  # descarga/conversión DEMs y kernels
│  ├─ catalog/sites.yaml        # fuente del catálogo curado
│  └─ notebooks/
├─ docs/
│  ├─ LUMEN_documento_tecnico.md
│  ├─ adr/
│  ├─ methodology.md
│  └─ validation.md
├─ infra/
│  ├─ docker-compose.yml        # dev local: engine + redis + postgres
│  └─ deploy/
├─ .github/workflows/
└─ README.md
```

---

## 8. Fuentes de datos y recursos

### 8.1 Topografía (DEM)

| Dataset | Cobertura | Resolución | Formato / Proyección | URL | Uso en LUMEN |
|---|---|---|---|---|---|
| **LOLA 5 m/px – sitios de aterrizaje del polo sur** (Barker et al. 2021) | Regiones de ~20×20 km: Site01 Connecting ridge, Site04 Shackleton rim, Site06 Nobile rim 1, Site07 Peak near Shackleton, Site11 de Gerlache rim, Site20 Leibnitz beta plateau, Site23 Malapert massif, Haworth, Shoemaker, DM2 Nobile rim 2 | 5 m | GeoTIFF, estereográfica polar sur, MOON_ME (DE421). Incluye LDEM (altura), LDEC (conteo de disparos), pendiente, incertidumbre Z, incertidumbre de pendiente, 100 "clones" | https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/ · README: https://core2.gsfc.nasa.gov/PGDA/LOLA_5mpp/README | Capa fina cerca del observador; clones para incertidumbre (🧪) |
| **Mosaico LOLA 5 m/px 87°–90°S** (Barker, PGDA product 81) | Todo el casquete 87–90°S | 5 m | GeoTIFF; `ldem_87s_5mpp` ≈ 3.3 GB; hillshade ≈ 820 MB; pendiente ≈ 4.9 GB | https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ · https://pgda.gsfc.nasa.gov/products/81 | Capa principal para coordenadas personalizadas cerca del polo |
| **DEMs mejorados con Shape-from-Shading** (Bertone, PGDA product 104) | 13 regiones originales candidatas de Artemis III | 5 m (resolución efectiva mayor en zonas iluminadas) | GeoTIFF | https://pgda.gsfc.nasa.gov/products/104 | 🧪 Mayor detalle cercano; comparar contra LOLA |
| **DEMs polares de LOLA (GDR)** | Casquetes polares (p. ej. 75°/80°/85°–90°) | ~20–240 m según producto | PDS IMG/GeoTIFF, estereográfica polar | PDS LOLA: https://imbrium.mit.edu/ (DATA → GDR) ⚠️ VERIFICAR nombres exactos (p. ej. `LDEM_80S_20M`, `LDEM_75S_*`) | Capa gruesa para horizonte lejano (hasta 150–200 km) |
| **SLDEM2015** (LOLA + Kaguya TC) | ±60° lat | ~60 m | PDS | https://imbrium.mit.edu/ (SLDEM2015) | Coordenadas fuera de los polos (latitudes medias) |
| **LOLA global DEM** (LDEM_64 / LDEM_128 / etc.) | Global | ~118 m (128 ppd) y menores | PDS / USGS Astropedia | https://imbrium.mit.edu/ · USGS Astrogeology ⚠️ VERIFICAR enlaces | Fallback global (Apollo, cara oculta, etc.) |
| **Productos de iluminación polar de LOLA** | Polos | Varios | PDS EXTRAS | https://imbrium.mit.edu/ (EXTRAS: polar illumination) | **Validación** de % iluminación (M15) y capa regional (M16) |

**Notas de procesamiento**
- Convertir todo a **COG** con overviews: `gdal_translate in.tif out_cog.tif -of COG -co COMPRESS=DEFLATE -co PREDICTOR=3 -co BLOCKSIZE=512 -co OVERVIEWS=AUTO` (para Float32 usar `PREDICTOR=3`).
- Crear un **VRT** o índice propio que indique, para un punto, qué capas lo cubren y con qué resolución.
- Verificar **NoData** y el porcentaje de píxeles interpolados (LDEC = 0 → interpolado). Los DEM 5 m polares tienen ~90% de píxeles interpolados por el espaciado de LOLA (según PGDA). Mostrar esto como advertencia de precisión.
- Registrar **datum vertical**: LOLA reporta alturas respecto a la esfera de 1 737.4 km. ⚠️ VERIFICAR para cada producto.

### 8.2 Efemérides y geometría (SPICE)

| Kernel | Tipo | Contenido | URL |
|---|---|---|---|
| `naif0012.tls` | LSK | Segundos intercalares (UTC↔TDB) | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/ ⚠️ VERIFICAR versión vigente |
| `de440s.bsp` (≈32 MB, 1849–2150) o `de440.bsp` (≈114 MB, rango mayor) | SPK | Posiciones de Sol, Tierra, Luna | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/planets/ |
| `moon_pa_de440_200625.bpc` | PCK binario | Orientación del marco MOON_PA (DE440), cobertura ~1550–2650 | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/ |
| `moon_de440_220930.tf` (o más reciente, p. ej. `moon_de440_250416.tf`) | FK | Define MOON_PA y MOON_ME (alias) para DE440 | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/ ⚠️ VERIFICAR versión más reciente |
| `pck00011.tpc` | PCK texto | Radios y constantes de cuerpos | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/ |
| `earth_*`/`earth_latest_high_prec.bpc` | PCK | 🧪 Orientación terrestre de alta precisión (solo si se calculan estaciones de la DSN) | idem |

Librerías: **SpiceyPy** (`pip install spiceypy`) — wrapper de CSPICE. Funciones clave: `furnsh`, `str2et`, `et2utc`, `spkcpo`, `azlcpo` (az/el desde posición constante, disponible en CSPICE N0067+), `latrec`, `pxform`, `occult`, `gfoclt`.

**Skyfield** (alternativa/cross-check): soporta cargar `.tf` y `.bpc` lunares y definir posiciones sobre la superficie lunar para observar el Sol y la Tierra (https://rhodesmill.org/skyfield/planetary.html).

**JPL Horizons API** (validación): https://ssd-api.jpl.nasa.gov/doc/horizons.html. Para observador en la Luna: `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='lon,lat,alt_km'`, `QUANTITIES='4'` (azimut/elevación aparente), `COMMAND='10'` (Sol) o `'399'` (Tierra). ⚠️ VERIFICAR parámetros exactos al implementar.

**NAIF WebGeocalc** (validación manual): https://wgc.jpl.nasa.gov:8443/webgeocalc/ ⚠️ VERIFICAR URL.

### 8.3 Visualización 3D

| Recurso | Descripción | URL | Notas |
|---|---|---|---|
| **Cesium Moon** (antes Cesium Moon Terrain) | 3D Tiles de toda la Luna a partir de datos LRO; mayor resolución en polos | https://cesium.com/platform/cesium-ion/content/cesium-moon/ | Requiere cuenta gratuita de Cesium ion y token; ⚠️ VERIFICAR asset ID y límites del plan gratuito |
| **CesiumJS** | Motor 3D web | https://cesium.com/platform/cesiumjs/ | Licencia Apache 2.0 |
| **Resium** | Componentes React para Cesium | https://resium.reearth.io/ | |
| **NASA SVS CGI Moon Kit** | Texturas de color (LROC WAC) y desplazamiento (LOLA) para render | https://svs.gsfc.nasa.gov/4720 ⚠️ VERIFICAR ID | Fallback three.js |
| **NASA SVS Moon Phase and Libration** | Visualizaciones de fase y libración por año | https://svs.gsfc.nasa.gov/ (buscar "Moon Phase and Libration 2026") | Material educativo / referencia |
| **LROC QuickMap** | Referencia visual y verificación | https://quickmap.lroc.asu.edu/ | |
| **Moon Trek** | Referencia y posibles servicios WMTS | https://trek.nasa.gov/moon/ | ⚠️ VERIFICAR si exponen tiles WMTS reutilizables y su licencia |

### 8.4 Información de misiones y sitios

| Fuente | Uso |
|---|---|
| NASA – Artemis III landing regions (press release oct-2024) https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/ | Lista de las 9 regiones candidatas |
| NASA CLPS https://www.nasa.gov/commercial-lunar-payload-services/ | Misiones y sitios CLPS |
| Planetary Society – Chang'e-7 https://www.planetary.org/space-missions/change-7 | Contexto de Chang'e-7 |
| Mazarico et al. (2011), *Illumination conditions of the lunar polar regions using LOLA topography*, Icarus 211(2), doi:10.1016/j.icarus.2010.10.030 | Numeración de sitios y valores de referencia de iluminación |
| Barker et al. (2021), *Improved LOLA Elevation Maps for South Pole Landing Sites*, Planetary & Space Science, doi:10.1016/j.pss.2020.105119 | Metodología y DEMs 5 m |
| Gläser et al. (2014, 2018) | Iluminación polar con LOLA ⚠️ VERIFICAR referencias exactas |
| CSA – Moon Exploration | Contexto de agencia socia |

### 8.5 Licencias y atribución

- Datos de NASA/JPL/PDS: en general dominio público de EE. UU.; **atribuir** siempre (LRO/LOLA, NAIF, JPL Horizons).
- Cesium ion / Cesium Moon: sujeto a los términos de Cesium; atribución en el visor (`creditContainer`).
- QuickMap (ASU): no reutilizar tiles sin revisar sus términos.
- Documentar todas las atribuciones en `/about` y en la entrega de Space Apps.

---

## 9. Algoritmos y modelos de cálculo

### 9.1 Pipeline general de análisis de un sitio

```
entrada: lat, lon, h_obs (altura del observador sobre el terreno, default 2 m),
         start, end, step (min), opciones

1. coverage   = dem.coverage(lat, lon)              # qué capas lo cubren
2. h0         = dem.sample(lat, lon)                # altura del terreno en el sitio
3. mask       = horizon.get_or_compute(lat, lon, h_obs)  # caché por sitio
4. times      = malla temporal [start, end] cada step
5. sun_azel   = ephem.azel('SUN', site, times)      # vectorizado
6. earth_azel = ephem.azel('EARTH', site, times)
7. sun_vis    = visibility.disk_fraction(sun_azel, mask, r_sun(t))
   earth_vis  = visibility.disk_fraction(earth_azel, mask, r_earth(t))
   eclipse    = ephem.sun_occulted_by_earth(site, times)
   sun_vis   *= (1 - eclipse_fraction)
8. metrics    = metrics.compute(sun_vis, earth_vis, sun_azel, ...)
9. events     = metrics.events(...)                 # salidas/puestas
10. return {mask, series, metrics, events, meta}
```

### 9.2 Geometría del sitio

- Posición del sitio en el marco **MOON_ME**, coordenadas cartesianas:
  `r_site = (R + h0 + h_obs) · [cos(lat)cos(lon), cos(lat)sin(lon), sin(lat)]`
  (modelo esférico con R = 1 737 400 m; LOLA usa esfera de referencia).
- Base topocéntrica local (ENU) en el sitio:
  - `Up = r_site / |r_site|`
  - `East = [−sin(lon), cos(lon), 0]`
  - `North = Up × East` → equivalentemente `[−sin(lat)cos(lon), −sin(lat)sin(lon), cos(lat)]`
  - ⚠️ Cerca del polo (lat → −90°) `East` sigue bien definido por `lon`; en el polo exacto, definir lon arbitraria (p. ej. 0) y documentar que el "norte" es la dirección de lon = 0. Validar que el usuario no ingrese exactamente −90 (o tratarlo con lon = 0).
- Azimut: `az = atan2(v·East, v·North)` normalizado a [0, 360). Elevación: `el = asin(v·Up / |v|)`.

### 9.3 Máscara de horizonte (ray-casting)

**Objetivo:** para cada azimut `α_k` (k = 0..N−1), el ángulo de elevación máximo del terreno visto desde el observador.

**Parámetros por defecto**
| Parámetro | Valor | Nota |
|---|---|---|
| Resolución azimutal | 0.25° (N = 1440) | 0.5° para búsquedas masivas |
| Alcance máximo | 200 km | El polo sur tiene relieves de varios km; a 200 km la caída por curvatura es ~11.5 km |
| Altura del observador | 2 m | Configurable (mástil de antena, panel en altura: 1–10 m) |
| Muestreo radial | adaptativo | Paso ≈ resolución de la capa usada a esa distancia |

**Capas multi-resolución (ejemplo)**
| Distancia | Capa | Paso radial |
|---|---|---|
| 0 – 10 km | 5 m (sitio o mosaico 87S) | 5 m |
| 10 – 40 km | 5 m mosaico o 20 m polar | 20 m |
| 40 – 200 km | 20–120 m polar | 60–120 m |

Si la capa fina no cubre una distancia, se usa la siguiente más gruesa disponible.

**Ángulo de elevación de un punto del terreno (esfera exacta)**

Sea el observador a radio `r0 = R + h0 + h_obs` y un punto del terreno a distancia angular `γ = d / R` (d = distancia sobre la superficie) con radio `r1 = R + h1`. En el plano que contiene el centro, el observador y el punto:

```
Δx = r1·sin(γ)                  # horizontal (perpendicular a Up del observador)
Δz = r1·cos(γ) − r0             # vertical (a lo largo de Up)
θ  = atan2(Δz, Δx)              # elevación del punto vista desde el observador
```

Esto incluye curvatura sin aproximaciones. (Aproximación equivalente para d ≪ R: `θ ≈ atan((h1 − h0 − h_obs − d²/(2R)) / d)`.)

**Punto a distancia d en azimut α (fórmula de destino en la esfera)**

```
φ1 = lat0, λ1 = lon0, δ = d / R
φ2 = asin( sin φ1 cos δ + cos φ1 sin δ cos α )
λ2 = λ1 + atan2( sin α sin δ cos φ1, cos δ − sin φ1 sin φ2 )
```

Luego `(φ2, λ2)` → proyección estereográfica polar → índice de píxel → **interpolación bilineal** de la altura.

**Pseudocódigo (numba)**

```python
@njit(parallel=True)
def horizon_mask(lat0, lon0, r0, az_deg, dist_m, layer_ids, dems, transforms, R):
    N = az_deg.size
    out = np.full(N, -90.0)
    out_dist = np.zeros(N)
    for k in prange(N):
        a = np.radians(az_deg[k])
        best = -np.pi / 2
        best_d = 0.0
        for j in range(dist_m.size):
            d = dist_m[j]
            lat, lon = destination(lat0, lon0, a, d / R)
            h1 = sample_bilinear(dems[layer_ids[j]], transforms[layer_ids[j]], lat, lon)
            if np.isnan(h1):
                continue
            g = d / R
            r1 = R + h1
            dx = r1 * np.sin(g)
            dz = r1 * np.cos(g) - r0
            th = np.arctan2(dz, dx)
            if th > best:
                best = th; best_d = d
        out[k] = np.degrees(best)
        out_dist[k] = best_d
    return out, out_dist   # elevación del horizonte y distancia al obstáculo
```

**Optimizaciones**
- Precomputar en el motor la lista de distancias por capa y cargar **solo las ventanas** de los COG que cubren el disco de 200 km (bounding box en estereográfica).
- Para el mosaico de 5 m, un disco de 40 km de radio son 16 000 × 16 000 píxeles (~1 GB en float32) → **no** cargar entero a 5 m; usar 5 m solo hasta ~10 km (4 000 × 4 000 = 64 MB) y overviews más allá.
- Early exit: no se puede descartar fácilmente porque una montaña lejana puede superar el máximo; pero se puede usar el límite superior `h_max_global` para cortar cuando ni el punto más alto posible superaría `best`.
- Complejidad: 1440 azimuts × ~3 000 muestras ≈ 4.3 M muestras → < 1 s con numba en un core moderno.

**Salida**
```json
{
  "az_step_deg": 0.25,
  "elevation_deg": [ ... 1440 valores ... ],
  "obstacle_distance_m": [ ... ],
  "observer": {"lat": -89.45, "lon": -137.3, "terrain_height_m": 1820.5, "obs_height_m": 2},
  "layers_used": ["LOLA_5mpp_87S", "LDEM_80S_20M"],
  "max_range_km": 200
}
```

**Interpolación de la máscara en un azimut arbitrario:** lineal entre los dos azimuts vecinos, con wrap-around en 360°.

### 9.4 Efemérides

#### 9.4.1 Inicialización

```python
import spiceypy as sp
for k in ["naif0012.tls", "de440s.bsp", "moon_pa_de440_200625.bpc",
          "moon_de440_220930.tf", "pck00011.tpc"]:
    sp.furnsh(f"kernels/{k}")
```
⚠️ Al cargar el FK, verificar que el alias `MOON_ME` apunte a la realización DE440 (`MOON_ME_DE440_ME421`) y documentarlo.

#### 9.4.2 Az/El desde el sitio (opción A: `azlcpo`)

```python
obspos = sp.latrec(R_km + (h0 + h_obs)/1000, np.radians(lon), np.radians(lat))  # km, MOON_ME
azlsta, lt = sp.azlcpo(method="ELLIPSOID", target="SUN", et=et, abcorr="LT+S",
                       azccw=False, elplsz=True, obspos=obspos,
                       obsctr="MOON", obsref="MOON_ME")
# azlsta[0]=range, [1]=az (rad), [2]=el (rad)
```
⚠️ `method="ELLIPSOID"` usa la forma de la Luna de los kernels (esfera en pck00011) para definir la vertical local; verificar que coincide con nuestra definición de Up (radial). Si no, usar la opción B.

#### 9.4.3 Opción B: vector + base ENU propia

```python
state, lt = sp.spkcpo(target="SUN", et=et, outref="MOON_ME", refloc="OBSERVER",
                      abcorr="LT+S", obssta=np.r_[obspos, 0, 0, 0],
                      obsctr="MOON", obsref="MOON_ME")
v = state[:3]
az, el = enu_azel(v, lat, lon)   # sección 9.2
```

Vectorizar: iterar sobre `et` en numpy; ~17 520 instantes (1 año cada 30 min) × 2 cuerpos es rápido (< 1 s–2 s). Para rangos largos, calcular a paso grueso (p. ej. 1 h) e **interpolar** az/el (son suaves) a pasos finos; manejar el wrap de azimut.

**Corrección de aberración:** usar `LT+S` (tiempo de luz + aberración estelar) para posición aparente. Diferencias con `NONE` son de segundos de arco; documentar.

#### 9.4.4 Eclipses (Sol ocultado por la Tierra)

```python
code = sp.occult("SUN", "ELLIPSOID", "IAU_SUN", "EARTH", "ELLIPSOID", "ITRF93" or "IAU_EARTH",
                 "LT", "MOON", et)   # observador ≈ centro lunar; para precisión usar posición del sitio
```
Más simple y suficiente: calcular la **separación angular** Sol–Tierra desde el sitio y los radios angulares; si `sep < r_earth + r_sun` hay ocultación parcial/total; fracción por área de intersección de dos círculos. Alternativa: `gfoclt` para encontrar intervalos de eclipse en el rango completo.

#### 9.4.5 Radios angulares

- `r_sun(t) = asin(R_sun / dist_sun(t))` con R_sun = 695 700 km → ≈ 0.266°.
- `r_earth(t) = asin(R_earth / dist_earth(t))` con R_earth = 6 371 km → ≈ 0.95°.

### 9.5 Visibilidad y fracción de disco

Sea `e` la elevación del centro del cuerpo, `r` su radio angular y `H` la elevación del horizonte en su azimut. Definimos `s = (e − H) / r` (cuántos radios por encima del horizonte está el centro). Aproximando el horizonte local como recta horizontal dentro del disco:

```
si s ≥ 1  → fracción = 1
si s ≤ −1 → fracción = 0
si no     → fracción = (θ − sin θ) / (2π)  con  θ = 2·acos(−s)    # área del segmento circular visible
```

(Verificación: s = 0 → θ = π → fracción = 0.5 ✔.)

**Umbrales configurables (defaults):**
| Concepto | Regla por defecto |
|---|---|
| `sun_visible` (booleano) | fracción del Sol ≥ 0.5 (centro visible) |
| `sun_power_factor` | fracción del Sol (continuo) para el simulador |
| `earth_visible` (comunicación) | elevación del centro de la Tierra ≥ H + margen; margen default = 0° (configurable 0–5° para simular máscara de antena) |
| `operable` | `sun_visible ∧ earth_visible` |

Mejora 🧪: para Tierra/Sol con horizonte muy irregular, muestrear el horizonte en varios azimuts dentro del disco (±r) en vez de suponer recta.

### 9.6 Métricas

Sea la serie booleana `S[i]` (Sol visible), `E[i]` (Tierra visible), paso `Δt`, N muestras.

| Métrica | Definición | Unidad |
|---|---|---|
| `illumination_pct` | `100 · Σ S[i] / N` | % |
| `illumination_pct_weighted` | `100 · Σ frac_sun[i] / N` | % |
| `longest_dark_h` | máxima longitud de racha consecutiva con `S = 0` × Δt | horas |
| `longest_dark_interval` | inicio y fin de esa racha | UTC |
| `dark_periods_count` | número de rachas `S = 0` | — |
| `earth_visible_h` | `Σ E[i] · Δt` | horas |
| `earth_visible_pct` | `100 · Σ E[i] / N` | % |
| `longest_comm_window_h` | máxima racha `E = 1` | horas |
| `longest_comm_blackout_h` | máxima racha `E = 0` | horas |
| `operable_pct` | `100 · Σ (S ∧ E) / N` | % |
| `longest_operable_window_h` | máxima racha `S ∧ E` | horas |
| `sun_elev_mean_visible_deg` | media de elevación solar cuando `S = 1` | ° |
| `sun_elev_max_deg` / `min` | extremos de elevación solar | ° |
| `earth_elev_mean_deg` / `max` / `min` | estadísticas de elevación de la Tierra | ° |
| `eclipse_hours` | horas con Sol ocultado por la Tierra | horas |
| `first_sunrise_after_landing` | si se aterriza de noche | UTC |
| `energy_kwh_per_m2` | integral de irradiancia efectiva (vertical tracking) | kWh/m² |

**Eventos**: lista de transiciones `{type: sunrise|sunset|earthrise|earthset|eclipse_start|eclipse_end, time}` detectadas por cambio de `S`/`E`; refinar el instante por **interpolación lineal** del margen `(e − H)` entre muestras (o búsqueda binaria con efemérides a paso fino).

**Tiempo a sunset/Earthset desde `t*`**: buscar el primer evento `sunset`/`earthset` con `time > t*`; si el cuerpo está oculto en `t*`, devolver el próximo `sunrise`/`earthrise`. Si no hay evento en el rango, devolver "> fin del rango" y opcionalmente extender la búsqueda.

**Rachas que tocan los bordes del rango**: marcarlas como "truncadas" (`truncated: true`) porque podrían ser más largas fuera del rango.

### 9.7 Score compuesto (para comparador y buscador)

Score configurable por el usuario (pesos con sliders):

```
score = w1·norm(illumination_pct) + w2·norm(−longest_dark_h)
      + w3·norm(earth_visible_pct) + w4·norm(longest_comm_window_h)
      + w5·norm(operable_pct)
```
`norm` = min-max entre los sitios comparados (o contra rangos fijos documentados). Mostrar siempre las métricas crudas además del score.

### 9.8 Simulador de energía/batería

**Parámetros**
| Parámetro | Símbolo | Default (preset "lander pequeño") |
|---|---|---|
| Área de panel | A | 2 m² |
| Eficiencia (celda + MPPT + degradación) | η | 0.28 |
| Orientación | — | vertical con seguimiento azimutal |
| Capacidad de batería | C | 2 000 Wh |
| Estado de carga inicial | SoC₀ | 100% |
| Profundidad máxima de descarga | DoD | 80% |
| Consumo con luz | P_day | 150 W |
| Consumo sin luz (supervivencia) | P_night | 60 W |
| Eficiencia carga/descarga | η_b | 0.95 |

**Irradiancia**
```
S0(t) = 1361 · (1 AU / d_sun(t))²                 # W/m²
P_gen(t) = η · A · S0(t) · frac_sun(t) · g(el, orientación)
g = cos(el)            # vertical con seguimiento en azimut
g = sin(max(el, 0))    # horizontal
g = max(0, cos(el)·cos(az − az_panel))   # vertical fijo apuntando a az_panel
```

**Integración** (paso Δt en horas)
```
P_load = P_day si frac_sun > 0 sino P_night
ΔE = (P_gen − P_load) · Δt
si ΔE > 0: E += ΔE · η_b  (cargar)  ;  si ΔE < 0: E += ΔE / η_b  (descargar)
E = clamp(E, C·(1−DoD), C)
si E llega al mínimo y P_gen < P_load → evento "brownout" (falla de energía)
```

**Salidas**: series `P_gen`, `P_load`, `SoC%`; `survives: bool`, `first_brownout_time`, `min_soc_pct`, `energy_margin_wh`.

**Limitaciones (documentar)**: no modela temperatura, polvo, sombreado parcial del propio lander, ni RTG/calentadores.

### 9.9 What-if de retraso

```
para cada retraso k en [0, Kmax] (paso 1 día o 6 h):
    t_land = t_nominal + k
    rango = [t_land, t_land + duración_misión]
    métricas = metrics(series_recortadas(rango))   # reusar series ya calculadas para el rango total
    (opcional) simulación de batería
graficar métrica vs k; marcar k óptimos y "zonas prohibidas"
```
**Eficiencia**: calcular las series una sola vez para `[t_nominal, t_nominal + Kmax + duración]` y evaluar ventanas deslizantes (sumas acumuladas para %; para rachas máximas, recomputar por ventana o usar estructura de segmentos).

### 9.10 Buscador de mejor punto

```
entrada: centro (lat, lon), radio_km, espaciado (m), métrica objetivo, pendiente_max
1. malla de candidatos en estereográfica alrededor del centro (espaciado 100–500 m)
2. filtrar por pendiente (capa de pendiente LOLA) ≤ pendiente_max
3. para cada candidato: máscara de horizonte rápida (0.5–1° az, alcance 200 km, sin capa 5 m más allá de 2 km)
4. evaluar métricas con las efemérides (la dirección Sol/Tierra casi no cambia en pocos km:
   reusar az/el del centro y corregir por desplazamiento → error despreciable para radios < 20 km;
   ⚠️ validar el error con 2–3 puntos completos)
5. ranking top-K; mapa de calor de la métrica
6. refinar top-K con cálculo completo (0.25°)
```
Costo: 20 km de radio con 250 m de espaciado ≈ 20 000 candidatos → paralelizar (numba prange / multiprocessing) y procesar como **job** con progreso. Precalcular para las regiones del catálogo.

### 9.11 Iluminación para el globo 3D

- Dirección del Sol en el marco MOON_ME (vector unitario) en el instante → `DirectionalLight` de Cesium (no usar el sol por defecto de Cesium, que es para la Tierra).
- Terminador: emerge del sombreado con esa luz; 🧪 opcional: dibujar la línea del terminador como polilínea (puntos donde el Sol tiene elevación 0 sobre la esfera: el círculo máximo perpendicular a la dirección del Sol).
- Dirección de la Tierra desde el sitio: flecha/billboard en la escena + mini "brújula" con az/el.
- Endpoint `/v1/ephem/state?t=` devuelve vectores Sol y Tierra en MOON_ME para el globo (barato; puede cachearse por hora).

### 9.12 Incertidumbre (🧪)

- Los DEMs 5 m de sitios traen **100 clones** (realizaciones con error). Calcular la máscara con N clones (p. ej. 20) → banda de incertidumbre del horizonte y rango de métricas (p5–p95). Excelente para el criterio de Validity.

---

## 10. Especificación de la API del motor

Base: `/v1`. JSON. Fechas ISO 8601 UTC. Errores con formato `{"error": {"code": "...", "message": "...", "details": {...}}}`. OpenAPI en `/docs` (Swagger) y `/openapi.json`.

### 10.1 Endpoints

| Método | Ruta | Descripción | Síncrono |
|---|---|---|---|
| GET | `/v1/health` | Estado, versión, kernels cargados, capas DEM disponibles | Sí |
| GET | `/v1/sites` | Catálogo curado (filtros: `program`, `country`, `region`, `q`) | Sí |
| GET | `/v1/sites/{id}` | Detalle de un sitio del catálogo | Sí |
| GET | `/v1/coverage?lat&lon` | Capas DEM que cubren el punto, resolución y advertencias | Sí |
| GET | `/v1/terrain/point?lat&lon` | Altura y pendiente en el punto | Sí |
| POST | `/v1/horizon` | Máscara de horizonte (cacheada; si no existe → job) | Mixto |
| POST | `/v1/ephemeris` | Series az/el/distancia de Sol y Tierra | Sí (rangos ≤ 2 años) |
| POST | `/v1/analyze` | Pipeline completo (horizonte + efemérides + visibilidad + métricas + eventos) | Mixto (job si no hay caché) |
| GET | `/v1/jobs/{job_id}` | Estado y progreso de un job; resultado cuando termina | Sí |
| POST | `/v1/compare` | Analiza 2–4 escenarios (sitio+rango) y devuelve tabla comparativa | Mixto |
| POST | `/v1/power/simulate` | Simulación de batería sobre un análisis existente | Sí |
| POST | `/v1/whatif` | Métricas vs retraso | Mixto |
| POST | `/v1/search/best-spot` | Buscador de mejor punto | Job |
| GET | `/v1/ephem/state?t` | Vectores Sol/Tierra en MOON_ME (para el globo) | Sí |
| GET | `/v1/events?lat&lon&from&kinds` | Próximos eventos (sunset, earthset…) desde un instante | Sí |
| POST | `/v1/export` | Genera CSV/JSON/PDF de un análisis | Job |
| GET | `/v1/validation` | Resultados precalculados de validación | Sí |

### 10.2 Esquemas principales

**SiteInput**
```json
{
  "lat": -89.45,
  "lon": -137.31,
  "obs_height_m": 2.0,
  "name": "Mi punto",
  "catalog_id": null
}
```

**TimeRange**
```json
{ "start": "2027-01-01T00:00:00Z", "end": "2027-03-01T00:00:00Z", "step_minutes": 30 }
```
Límites: `end − start` ≤ 2 años (configurable); `step_minutes` ∈ [5, 360]; N máx. de muestras 100 000.

**AnalyzeRequest**
```json
{
  "site": { "...SiteInput" },
  "range": { "...TimeRange" },
  "thresholds": { "sun_min_fraction": 0.5, "earth_margin_deg": 0.0 },
  "options": { "az_step_deg": 0.25, "max_range_km": 200, "include_series": true, "include_mask": true }
}
```

**AnalyzeResponse** (o `{ "job_id": "..." , "status": "queued" }` con HTTP 202)
```json
{
  "site": { "lat": -89.45, "lon": -137.31, "terrain_height_m": 1820.5, "obs_height_m": 2 },
  "coverage": { "layers": ["LOLA_5mpp_87S", "LDEM_80S_20M"], "near_res_m": 5, "interpolated_fraction": 0.89, "warnings": [] },
  "horizon": { "az_step_deg": 0.25, "elevation_deg": ["..."], "obstacle_distance_m": ["..."] },
  "series": {
    "time": ["2027-01-01T00:00:00Z", "..."],
    "sun":   { "az": ["..."], "el": ["..."], "fraction": ["..."], "dist_km": ["..."] },
    "earth": { "az": ["..."], "el": ["..."], "fraction": ["..."], "dist_km": ["..."] },
    "horizon_at_sun": ["..."],
    "horizon_at_earth": ["..."],
    "eclipse_fraction": ["..."],
    "sun_visible": ["..."], "earth_visible": ["..."], "operable": ["..."]
  },
  "metrics": {
    "illumination_pct": 81.2,
    "illumination_pct_weighted": 79.8,
    "longest_dark_h": 96.5,
    "longest_dark_interval": { "start": "...", "end": "...", "truncated": false },
    "earth_visible_pct": 52.0,
    "earth_visible_h": 737.0,
    "longest_comm_window_h": 210.0,
    "longest_comm_blackout_h": 300.5,
    "operable_pct": 44.1,
    "longest_operable_window_h": 150.0,
    "sun_elev_mean_visible_deg": 1.2,
    "sun_elev_max_deg": 2.6,
    "earth_elev_mean_deg": 0.8,
    "eclipse_hours": 0.0,
    "energy_kwh_per_m2": 1200.0
  },
  "events": [ { "type": "sunset", "time": "..." }, { "type": "earthrise", "time": "..." } ],
  "meta": { "engine_version": "0.1.0", "kernels": ["de440s.bsp", "..."], "computed_at": "...", "cache_hit": true, "elapsed_ms": 412 }
}
```
(Los valores numéricos del ejemplo son ilustrativos, no reales.)

**Series grandes**: para rangos largos, ofrecer `format=columnar` (arrays planos) o `application/x-msgpack`; considerar **downsampling** para la UI (el heatmap necesita como máximo 1 valor por hora).

**PowerSimRequest**
```json
{
  "analysis_ref": { "site": {"...": "..."}, "range": {"...": "..."} },
  "config": {
    "panel_area_m2": 2, "efficiency": 0.28, "orientation": "vertical_tracking",
    "panel_azimuth_deg": null, "battery_wh": 2000, "soc0_pct": 100, "max_dod_pct": 80,
    "load_day_w": 150, "load_night_w": 60, "battery_efficiency": 0.95
  }
}
```

**WhatIfRequest**
```json
{
  "site": {"...": "..."},
  "nominal_landing": "2027-02-10T00:00:00Z",
  "max_delay_days": 60, "delay_step_hours": 24,
  "mission_duration_days": 14,
  "metrics": ["illumination_pct", "longest_dark_h", "operable_pct"],
  "power": null
}
```

**BestSpotRequest**
```json
{
  "center": {"lat": -89.45, "lon": -137.31},
  "radius_km": 5, "spacing_m": 250, "max_slope_deg": 8,
  "range": {"...": "..."},
  "objective": "illumination_pct",
  "weights": null, "top_k": 5
}
```

**JobStatus**
```json
{ "job_id": "j_123", "status": "running", "progress": 0.42, "stage": "horizon", "result_url": null, "error": null }
```
Estados: `queued | running | done | failed`. El frontend hace polling cada 1 s (o SSE 🧪 en `/v1/jobs/{id}/events`).

### 10.3 Validaciones y límites

- Coordenadas fuera de rango → 422.
- Punto sin cobertura DEM mínima → se usa el DEM global y se agrega advertencia; si no hay ninguna capa → 422 `NO_COVERAGE`.
- Rango temporal fuera de la cobertura de kernels → 422 `OUT_OF_EPHEMERIS_RANGE`.
- Rate limiting (en BFF): p. ej. 30 análisis nuevos/min por IP.

---

## 11. Modelo de datos, caché y almacenamiento

### 11.1 Clave de caché del horizonte

Las coordenadas lat/lon cerca del polo son malas como clave (un grado de longitud mide casi nada). Usar **coordenadas estereográficas redondeadas**:

```
key_horizon = sha1( f"{dem_version}|{round(x_m/5)*5}|{round(y_m/5)*5}|{obs_height_m:.1f}|{az_step}|{max_range_km}" )
```
Para latitudes medias (fuera de la proyección polar), usar lat/lon redondeados a 1e-4°.

### 11.2 Tablas (PostgreSQL)

```sql
CREATE TABLE sites_catalog (
  id            TEXT PRIMARY KEY,          -- 'artemis3-malapert-massif'
  name          TEXT NOT NULL,
  lat           DOUBLE PRECISION NOT NULL,
  lon           DOUBLE PRECISION NOT NULL,
  program       TEXT,                      -- 'Artemis', 'CLPS', 'Apollo', 'CNSA', 'ISRO', ...
  country       TEXT,
  status        TEXT,                      -- 'candidate', 'landed', 'planned', 'historic'
  region        TEXT,                      -- 'south_pole', 'nearside', 'farside'
  description_es TEXT, description_en TEXT,
  source_url    TEXT,
  coord_precision TEXT,                    -- 'exact', 'approx_region_center', ...
  verified      BOOLEAN DEFAULT FALSE
);

CREATE TABLE horizon_masks (
  key           TEXT PRIMARY KEY,
  lat DOUBLE PRECISION, lon DOUBLE PRECISION,
  x_m DOUBLE PRECISION, y_m DOUBLE PRECISION,
  obs_height_m  REAL,
  az_step_deg   REAL,
  max_range_km  REAL,
  dem_version   TEXT,
  terrain_height_m REAL,
  elevation_deg REAL[]   NOT NULL,         -- o BYTEA con float32
  obstacle_distance_m REAL[],
  layers_used   TEXT[],
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE analyses (
  key           TEXT PRIMARY KEY,          -- hash(horizon_key, range, step, thresholds, engine_version)
  horizon_key   TEXT REFERENCES horizon_masks(key),
  start_utc TIMESTAMPTZ, end_utc TIMESTAMPTZ, step_minutes INT,
  thresholds    JSONB,
  metrics       JSONB,
  events        JSONB,
  series_url    TEXT,                      -- series grandes en object storage (parquet/msgpack)
  engine_version TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY, kind TEXT, status TEXT, progress REAL, stage TEXT,
  request JSONB, result_key TEXT, error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ
);

CREATE TABLE shared_scenarios (           -- 🧪 links cortos (alternativa a URL larga)
  slug TEXT PRIMARY KEY, state JSONB, created_at TIMESTAMPTZ DEFAULT now()
);
```

### 11.3 Redis

- Cola de jobs (arq/rq).
- Caché caliente: `horizon:{key}`, `analysis:{key}` con TTL (p. ej. 7 días).
- Rate limiting si se hace en el motor.

### 11.4 Object storage

```
s3://lumen-data/
├─ dem/
│  ├─ lola_5mpp_87s/ldem_87s_5mpp_cog.tif
│  ├─ lola_5mpp_sites/site01_surf_cog.tif ...
│  ├─ lola_polar_20m/...
│  ├─ sldem2015/...
│  └─ index.json          # capas, bounding boxes, resolución, proyección, versión
├─ precomputed/
│  ├─ masks/{key}.bin
│  └─ regions/{region_id}/illumination_grid.tif   (M16)
└─ series/{analysis_key}.parquet
```

---

## 12. Frontend (Next.js): páginas, componentes, estado

### 12.1 Páginas

| Ruta | Contenido | Notas |
|---|---|---|
| `/` | Landing: propuesta de valor, demo animada, CTA "Explorar" | SSR, ligera |
| `/explore` | Globo 3D a pantalla completa + panel lateral (selector de sitio, rango, sitios agregados) | Cesium cargado con `dynamic(..., { ssr: false })` |
| `/site` | Detalle de sitio: cabecera con métricas clave + pestañas (Horizonte, Timeline, Métricas, Energía, What-if, Terreno 3D) | Estado en URL (`?lat&lon&start&end&t&tab`) |
| `/compare` | Comparador 2–4 escenarios | `?s=lat,lon,start,end;...` |
| `/search` | Buscador de mejor punto | |
| `/learn` | Modo Explorar: tours, explicaciones, comparaciones Tierra vs Luna | |
| `/validation` | Página de validación (M15) | |
| `/about` | Metodología, datos, atribuciones, equipo, declaración de IA | |

### 12.2 Componentes clave

**`<HorizonPolar />`** (M2)
- D3 sobre SVG o Canvas.
- Escala radial: elevación (centro = cenit 90°, borde = −5°). **Problema**: todo ocurre entre −3° y +10° → usar escala radial **no lineal** (p. ej. lineal a tramos con zoom en [−5°, 15°]) o selector de "rango de elevación visible". Default: borde −5°, círculo intermedio 0° destacado, anillo exterior hasta 15°, centro comprimido.
- Capas: (1) cielo, (2) terreno (polígono relleno de la máscara), (3) línea de 0° y horizonte matemático (dip), (4) trayectoria Sol (amarillo; segmentos ocultos punteados), (5) trayectoria Tierra (azul), (6) marcadores en `currentTime` con tamaño angular real (toggle), (7) puntos cardinales.
- Interacción: hover → tooltip; clic en trayectoria → set `currentTime`.
- Variante **`<HorizonUnrolled />`**: eje X azimut 0–360°, eje Y elevación con zoom; muy legible para planificadores.

**`<VisibilityHeatmap />`** (M3)
- ECharts heatmap: eje Y = días (fecha), eje X = horas (0–23 UTC); celdas coloreadas.
- Tres paneles alineados: Sol, Tierra, Operable.
- Escala de color: verde (visible) → amarillo (parcial) → rojo (no visible); paleta accesible para daltónicos (validar con la skill/guía de dataviz; ofrecer modo alto contraste).
- Overlays: rectángulo/bracket de la racha oscura más larga y del apagón más largo.
- Línea/indicador del `currentTime`.
- Alternativa de agrupación: "día lunar" (lunación) en vez de días calendario (🧪).

**`<Globe />`** (M4)
- Resium `<Viewer>` con `globe={false}` + `<Cesium3DTileset>` Cesium Moon (ion asset).
- ⚠️ Configurar elipsoide lunar (`Cesium.Ellipsoid.MOON`) y, si la versión lo soporta, `Ellipsoid.default`; ⚠️ VERIFICAR API en la versión instalada.
- Luz: `scene.light = new DirectionalLight({ direction })` con el vector del Sol del motor (convertido al marco de la escena).
- Desactivar: geocoder, baseLayerPicker, sceneModePicker (2D/Columbus no soportado para tilesets globales lunares, según ejemplo de Cesium).
- Marcadores (`Entity` con `billboard`/`point` + `label`), clic → `selectSite`.
- Control de tiempo propio (no el `Clock` por defecto o sincronizado con él).
- Copiar assets de Cesium a `public/cesium` (script postinstall) y definir `window.CESIUM_BASE_URL = '/cesium'`.
- Fallback 🧪: si no hay token de ion, usar three.js + CGI Moon Kit.

**`<TimeControls />`**: slider de rango + play/pause + velocidad + "ir a próximo sunset/earthset" + input de fecha exacta.

**`<SitePicker />`**: buscador del catálogo (combobox), formulario lat/lon (decimal/DMS), botón "elegir en mapa", lista de sitios activos (máx. 4) con colores asignados.

**`<MetricsPanel />`** y **`<Countdowns />`**: tarjetas con métricas clave y contadores en vivo respecto a `currentTime`.

**`<CompareTable />`**: tabla con columnas por escenario, mejor valor destacado, mini-gráficos.

**`<PowerSimulator />`**: formulario de parámetros + presets + gráfico SoC/potencia (ECharts) + veredicto.

**`<WhatIfChart />`**: métrica vs retraso con bandas de recomendación.

**`<JobProgress />`**: barra de progreso con etapas ("Leyendo terreno…", "Calculando horizonte…", "Calculando efemérides…").

**`<ExplainTooltip />`** y **`<Tour />`**: textos educativos (modo Explorar).

### 12.3 Estado en URL (nuqs)

Ejemplo de URL compartible:
```
/site?lat=-89.45&lon=-137.31&h=2&start=2027-01-01&end=2027-03-01&step=30&t=2027-01-15T06:00Z&tab=horizon&mode=planner
/compare?s=-89.45,-137.31,2027-01-01,2027-03-01&s=-85.9,0.3,2027-01-01,2027-03-01&metric=operable_pct
```

### 12.4 Rendimiento

- Cesium solo en rutas que lo necesitan (code-splitting).
- Series grandes: downsample en servidor según la vista (heatmap = 1 h; polar = trayectoria simplificada con Ramer–Douglas–Peucker).
- TanStack Query con `staleTime` alto (los resultados son deterministas).
- Web Worker 🧪 para recalcular métricas en el cliente al cambiar umbrales sin volver al servidor (las series ya están en el cliente).

### 12.5 Accesibilidad

- Contraste AA; paletas aptas para daltonismo; no depender solo del color (patrones/etiquetas).
- Navegación por teclado en controles de tiempo y selector.
- Textos alternativos y resúmenes en texto de cada gráfico ("El Sol es visible el 81% del tiempo; la noche más larga dura 4 días").

---

## 13. Catálogo de sitios curados

> Todas las coordenadas deben **verificarse** en QuickMap o en la fuente primaria antes de marcarse `verified: true`. Las de regiones (Artemis III) son **centros aproximados** de regiones de ~15×15 km.

### 13.1 Polo sur — regiones candidatas de Artemis III (NASA, octubre 2024)

NASA publicó 9 regiones candidatas (sin orden de prioridad). Fuente: https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/

| id | Nombre | Lat / Lon (aprox.) | Estado |
|---|---|---|---|
| `a3-peak-near-cabeus-b` | Peak near Cabeus B | ⚠️ VERIFICAR | candidate |
| `a3-haworth` | Haworth | ⚠️ VERIFICAR | candidate |
| `a3-malapert-massif` | Malapert Massif | ≈ −86.0, 0 ⚠️ VERIFICAR | candidate |
| `a3-mons-mouton-plateau` | Mons Mouton Plateau | ⚠️ VERIFICAR | candidate |
| `a3-mons-mouton` | Mons Mouton | ⚠️ VERIFICAR | candidate |
| `a3-nobile-rim-1` | Nobile Rim 1 | ⚠️ VERIFICAR | candidate |
| `a3-nobile-rim-2` | Nobile Rim 2 | ⚠️ VERIFICAR | candidate |
| `a3-de-gerlache-rim-2` | de Gerlache Rim 2 | ⚠️ VERIFICAR | candidate |
| `a3-slater-plain` | Slater Plain | ⚠️ VERIFICAR | candidate |

> ⚠️ VERIFICAR el estado actual del programa Artemis (calendario y misión que realizará el primer aterrizaje) antes del pitch; hay reportes de cambios en el perfil de misiones en 2026. Usar la frase neutra "regiones candidatas de aterrizaje de Artemis".

### 13.2 Polo sur — sitios de referencia de iluminación (Mazarico et al. 2011 / PGDA)

| id | Nombre | Lat / Lon | Fuente |
|---|---|---|---|
| `pgda-site01` | Connecting ridge (Shackleton–de Gerlache) | ⚠️ VERIFICAR (≈ −89.4, ≈ −137) | PGDA LOLA_5mpp |
| `pgda-site04` | Shackleton rim | ⚠️ VERIFICAR | PGDA |
| `pgda-site06` | Nobile rim 1 | ⚠️ VERIFICAR | PGDA |
| `pgda-site07` | Peak near Shackleton | ⚠️ VERIFICAR | PGDA |
| `pgda-site11` | de Gerlache rim | ⚠️ VERIFICAR | PGDA |
| `pgda-site20` | Leibnitz beta plateau | ⚠️ VERIFICAR | PGDA |
| `pgda-site23` | Malapert massif | ⚠️ VERIFICAR | PGDA |
| `crater-shackleton-center` | Shackleton (centro del cráter, PSR) | ≈ −89.67, ≈ 129.8 ⚠️ VERIFICAR | — (ejemplo de sombra permanente) |

> Las coordenadas exactas de estos sitios pueden obtenerse de los shapefiles `*_ROIs.tgz` del README de PGDA.

### 13.3 Misiones de otros países y comerciales

| id | Misión | Lugar | Lat / Lon | Estado |
|---|---|---|---|---|
| `cnsa-change7` | Chang'e-7 (CNSA) | Pico cerca de la cresta sureste de Shackleton | −88.8, 123.4 (Wikipedia, aprox.) ⚠️ VERIFICAR | planned / ⚠️ VERIFICAR estado actual (lanzamiento previsto 2.º semestre 2026) |
| `isro-ch3` | Chandrayaan-3 Vikram (ISRO) | Statio Shiv Shakti | −69.37, 32.32 ⚠️ VERIFICAR | landed 2023 |
| `im2-athena` | IM-2 Athena (Intuitive Machines, CLPS) | Cerca de Mons Mouton | ⚠️ VERIFICAR | landed 2025 (volcó) ⚠️ VERIFICAR |
| `cnsa-change4` | Chang'e-4 | Von Kármán (cara oculta) | −45.44, 177.60 ⚠️ VERIFICAR | landed 2019 |
| `cnsa-change6` | Chang'e-6 | Cuenca Apollo (cara oculta) | ≈ −41.6, −154.0 ⚠️ VERIFICAR | landed 2024 |
| `jaxa-slim` | SLIM (JAXA) | Cerca de Shioli | ≈ −13.3, 25.2 ⚠️ VERIFICAR | landed 2024 |
| `firefly-bg1` | Blue Ghost M1 (Firefly, CLPS) | Mare Crisium (Mons Latreille) | ⚠️ VERIFICAR | landed 2025 |
| `im1-odysseus` | IM-1 Odysseus (CLPS) | Malapert A | ≈ −80.1, 1.4 ⚠️ VERIFICAR | landed 2024 |

### 13.4 Apollo (referencias ecuatoriales — contraste educativo)

| id | Misión | Lat | Lon (E+) |
|---|---|---|---|
| `apollo11` | Apollo 11 (Tranquility Base) | 0.674 | 23.473 |
| `apollo12` | Apollo 12 | −3.012 | −23.422 |
| `apollo14` | Apollo 14 | −3.645 | −17.471 |
| `apollo15` | Apollo 15 | 26.132 | 3.634 |
| `apollo16` | Apollo 16 | −8.973 | 15.498 |
| `apollo17` | Apollo 17 | 20.191 | 30.772 |

⚠️ VERIFICAR (valores de memoria; confirmar con NASA/LROC).

### 13.5 Formato del catálogo (`data/catalog/sites.yaml`)

```yaml
- id: a3-malapert-massif
  name: Malapert Massif
  lat: -86.0
  lon: 0.0
  program: Artemis
  agency: NASA
  country: USA
  status: candidate
  region: south_pole
  coord_precision: approx_region_center
  verified: false
  source_url: https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/
  description_es: "Macizo de gran altura con buena visibilidad de la Tierra..."
  description_en: "High massif with good Earth visibility..."
```

---

## 14. Validación científica y pruebas

### 14.1 Validación de efemérides (obligatoria antes de construir UI)

1. Elegir 5 sitios (polo, latitudes medias, cara oculta) y 20 instantes aleatorios en 2026–2028.
2. Consultar JPL Horizons (API) con `CENTER=coord@301` para Sol y Tierra (az/el aparentes, sin refracción).
3. Comparar con el motor: **tolerancia objetivo ≤ 0.01°** en az/el (más estricta en elevación).
4. Documentar diferencias (convención de azimut, corrección de aberración, marco ME vs PA).
5. Guardar como test de regresión (`tests/validation/test_vs_horizons.py`, con fixtures JSON grabados para no depender de la red en CI).

### 14.2 Validación de horizonte

- **DEM sintético plano** (h = 0): horizonte = −dip(h_obs) en todos los azimuts. Verificar con tolerancia 1e-4°.
- **Cono/montaña analítica** a distancia conocida: verificar ángulo exacto.
- **Simetría**: DEM radialmente simétrico → horizonte constante.
- **Comparación visual** contra el perfil de horizonte/vistas de QuickMap o Moon Trek en 2–3 sitios.
- **Convergencia**: el resultado no debe cambiar significativamente al reducir el paso radial a la mitad o aumentar el alcance de 200 a 300 km.

### 14.3 Validación de iluminación

- Comparar `illumination_pct` en los sitios de PGDA (Connecting ridge, Shackleton rim, etc.) contra los valores publicados (Mazarico 2011, Gläser, Barker 2021, productos de iluminación de imbrium) para el mismo periodo cuando sea posible.
- Reportar diferencias en `/validation` con explicación (periodo distinto, altura del observador, resolución del DEM).

### 14.4 Pruebas de software

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitarias Python | pytest + hypothesis | geometría, fracción de disco, rachas, eventos, simulador |
| Benchmarks | pytest-benchmark | horizonte < 2 s, análisis 1 año < 3 s con caché de horizonte |
| API | pytest + httpx | contratos, errores, límites |
| Unitarias TS | Vitest | formatters, conversión de coordenadas (DMS, 0–360), estado URL |
| Componentes | Testing Library | SitePicker, MetricsPanel |
| E2E | Playwright | flujo CU-01, CU-02, compartir URL |
| Visual 🧪 | Playwright screenshots | regresiones de gráficos |

### 14.5 Definition of Done (por historia)

- Código revisado (PR aprobado por 1+ persona).
- Tests pasan en CI; cobertura de lógica de cálculo ≥ 80%.
- Tipos generados actualizados si cambió la API.
- Accesible por teclado; textos en ES (y EN si i18n).
- Documentado en `docs/` si cambia la metodología.

---

## 15. Infraestructura, despliegue y DevOps

### 15.1 Desarrollo local

```yaml
# infra/docker-compose.yml (resumen)
services:
  engine:
    build: ../services/engine
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=postgresql://lumen:lumen@db:5432/lumen
      - REDIS_URL=redis://redis:6379/0
      - DEM_BASE_URL=/data/dem          # local en dev, s3:// o https:// en prod
      - KERNELS_DIR=/app/kernels
    volumes: ["../data/local:/data"]
  worker:
    build: ../services/engine
    command: arq lumen_engine.jobs.worker.WorkerSettings
  db:    { image: postgres:16, environment: [POSTGRES_USER=lumen, POSTGRES_PASSWORD=lumen] }
  redis: { image: redis:7 }
```
Frontend: `pnpm dev` en `apps/web` con `ENGINE_URL=http://localhost:8000`.

Variables de entorno (`.env.example`):
```
# web
ENGINE_URL=
NEXT_PUBLIC_CESIUM_ION_TOKEN=
NEXT_PUBLIC_APP_URL=
# engine
DATABASE_URL=
REDIS_URL=
DEM_BASE_URL=
DEM_INDEX_URL=
KERNELS_DIR=
AWS_ACCESS_KEY_ID= / AWS_SECRET_ACCESS_KEY= / S3_ENDPOINT=   (R2/S3)
MAX_RANGE_DAYS=730
```

### 15.2 Producción (propuesta)

| Componente | Opción | Notas |
|---|---|---|
| Frontend | Vercel | Natural para Next.js |
| Motor + worker | Fly.io / Render / Railway / VM con Docker | Necesita ≥ 2–4 GB RAM y varios cores para numba; GDAL en la imagen |
| PostgreSQL | Neon / Supabase / Postgres gestionado | |
| Redis | Upstash / Redis gestionado | |
| Object storage | Cloudflare R2 (sin egress) / S3 | COGs + series; habilitar HTTP range requests y CORS si el cliente lee directo |
| Dominio | p. ej. `lumen-moon.app` ⚠️ verificar disponibilidad | |

**Imagen Docker del motor**: base con GDAL (p. ej. `ghcr.io/osgeo/gdal:ubuntu-small-*`) + Python 3.12 + uv; descargar kernels en build (o volumen); precalentar caché de sitios del catálogo al arrancar (job "warmup").

### 15.3 CI/CD (GitHub Actions)

- `web.yml`: install (pnpm) → lint (eslint, prettier) → typecheck → test (vitest) → build.
- `engine.yml`: uv sync → ruff → mypy → pytest (sin red; fixtures) → build imagen.
- `openapi.yml`: generar `openapi.json` del motor → `openapi-typescript` → fallar si `packages/types` difiere (obliga a commitear tipos).
- `e2e.yml` (en PRs a `main`): docker compose up + Playwright.
- Deploy: `main` → producción; PRs → previews de Vercel.

### 15.4 Convenciones de repo

- Ramas: `main` (estable), `feat/*`, `fix/*`, `docs/*`.
- **Conventional Commits** (`feat(horizon): ...`).
- PR template con checklist de DoD.
- Issues etiquetados por módulo (`M2-horizon`, `M3-timeline`, ...) y prioridad (`mvp`, `ambitious`, `experimental`).
- CODEOWNERS por carpeta según roles.

### 15.5 Observabilidad

- Logs estructurados (JSON) en el motor con `request_id`, tiempos por etapa.
- Métricas básicas: tiempo de análisis, hit rate de caché, jobs en cola.
- Sentry (web y motor) 🧪.

---

## 16. Organización del equipo, fases y roadmap

### 16.1 Roles

| Rol | Responsable de | Módulos |
|---|---|---|
| **Geo/Datos** | Descarga y conversión de DEMs a COG, índice de capas, algoritmo de horizonte, incertidumbre | `dem/`, `horizon/`, M12, M16 |
| **Efemérides/Ciencia** | SPICE, visibilidad, eclipses, métricas, eventos, validación contra Horizons | `ephem/`, `visibility/`, `metrics/`, M15 |
| **Backend/Infra** | FastAPI, jobs, caché, BD, despliegue, CI | `api/`, `jobs/`, `db/`, infra |
| **Frontend 3D** | Globo Cesium, iluminación, terminador, terreno local | M4, M10 |
| **Frontend Charts/UX** | Polar, heatmap, comparador, simulador, what-if, estado URL | M2, M3, M5–M9, M13, M14 |
| **Producto/Diseño/Pitch** | Identidad LUMEN, UX writing, modo Explorar, tours, video, entrega en Space Apps, lectura de reglas | M11, sección 3, 18 |

(Si hay más integrantes, duplicar Frontend Charts/UX y Geo/Datos; si hay menos, combinar Backend con Efemérides.)

### 16.2 Fases

**Fase 0 — Preparación**
- [ ] Crear repo/monorepo, CI básico, `docker-compose`, plantillas.
- [ ] Leer Participant Guide y actualizar sección 3.
- [ ] Cuentas: Cesium ion, storage, hosting.
- [ ] Descargar kernels SPICE y un DEM pequeño (un sitio LOLA 5 m).

**Fase 1 — Prueba técnica (riesgo principal)** *(Geo + Ciencia)*
- [ ] Notebook: horizonte de 1 sitio (p. ej. Connecting ridge o Malapert) con DEM 5 m + capa gruesa.
- [ ] Efemérides Sol/Tierra con SPICE; comparación con Horizons (≤ 0.01°).
- [ ] Series de visibilidad y métricas para 1 año; sanity check contra valores publicados.
- [ ] Gráfico polar rápido en matplotlib para validar visualmente.
- **Salida**: notebook validado + funciones extraídas a `lumen_engine`.

**Fase 2 — Motor** *(Backend + Geo + Ciencia)*
- [ ] Índice multi-capa de DEM (COG en storage).
- [ ] Endpoints `/health`, `/coverage`, `/horizon`, `/ephemeris`, `/analyze`, `/jobs`, `/sites`.
- [ ] Caché (Postgres + Redis), jobs con progreso.
- [ ] Tests y OpenAPI → tipos TS.
- [ ] Warmup del catálogo.

**Fase 3 — UI núcleo** *(Frontend 3D + Charts)*
- [ ] Layout, navegación, SitePicker, TimeControls, estado URL.
- [ ] HorizonPolar + HorizonUnrolled.
- [ ] VisibilityHeatmap.
- [ ] MetricsPanel + Countdowns.
- [ ] Globe con marcadores, luz solar real y slider.
- [ ] Comparador de sitios y de fechas.

**Fase 4 — Diferenciadores**
- [ ] Simulador de batería (M8).
- [ ] What-if de retraso (M9).
- [ ] Buscador de mejor punto (M12).
- [ ] Exportación (M14).
- [ ] Terreno local 3D (M10).

**Fase 5 — Educación, validación y pulido**
- [ ] Modo Explorar + 3 tours (M11).
- [ ] Página de validación (M15) y metodología.
- [ ] i18n EN (M17) para jueces internacionales.
- [ ] Accesibilidad, rendimiento, responsive.
- [ ] Verificar todos los ⚠️ del documento.

**Fase 6 — Entrega**
- [ ] Demo en producción estable.
- [ ] Video/slides según formato oficial.
- [ ] Página del proyecto en Space Apps (descripción, datos NASA usados, agencia socia, IA, referencias).
- [ ] Ensayo del pitch.

### 16.3 Dependencias críticas

```
Fase 1 (horizonte + efemérides validados)
   └─► Fase 2 (API)
          ├─► Fase 3 (UI conectada)  ◄── (UI puede avanzar en paralelo con datos mock desde el día 1)
          └─► Fase 4
```
**Recomendación**: el frontend arranca en paralelo usando **fixtures JSON** con el formato exacto de `AnalyzeResponse` (sección 10.2) generados en Fase 1.

---

## 17. Riesgos y mitigaciones

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | DEMs muy pesados (GB) → lento/caro | Alta | Alto | COG + lectura por ventanas + multi-resolución + recortes regionales |
| R2 | Errores de marcos/convenciones (ME vs PA, azimut, longitudes 0–360) | Media | Alto | Sección 4.7 y 9.2, tests contra Horizons desde Fase 1 |
| R3 | Cálculo lento para coordenadas nuevas | Media | Medio | numba, caché, jobs con progreso, precálculo del catálogo |
| R4 | Coordenadas fuera de cobertura de DEM fino | Alta | Medio | Fallback global + advertencia de precisión visible |
| R5 | Cesium Moon requiere token/límites | Media | Medio | Cuenta temprana; fallback three.js + CGI Moon Kit |
| R6 | Integrar Cesium en Next.js (SSR, assets) | Media | Medio | `dynamic(ssr:false)`, script de copia de assets, prueba en Fase 0 |
| R7 | Alcance demasiado grande | Alta | Alto | Prioridades 🎯/🚀/🧪; MVP primero; congelar features antes de Fase 5 |
| R8 | Datos de sitios incorrectos | Media | Medio | `verified` en catálogo; verificar en QuickMap |
| R9 | Gráfico polar ilegible (todo cerca de 0°) | Alta | Medio | Escala radial no lineal + vista desplegada + zoom |
| R10 | Despliegue del motor (GDAL, RAM) | Media | Medio | Imagen GDAL oficial; probar deploy en Fase 2, no al final |
| R11 | Afirmaciones científicas incorrectas en el pitch | Media | Alto | Revisión cruzada por rol Ciencia; página de validación |
| R12 | Reglas de entrega mal entendidas | Baja | Alto | Responsable dedicado lee guía oficial en Fase 0 |

---

## 18. Identidad, UX y pitch

### 18.1 Marca

- **Nombre**: LUMEN — *Lunar Utility Map for Energy & Networks*.
- **Tagline**: "See the light. Keep the link." (ES: "Encuentra la luz. Mantén el enlace.")
- **Concepto visual**: contraste extremo luz/sombra del polo sur; Sol dorado (energía) y Tierra azul (comunicación) como los dos "personajes" constantes en toda la UI.
- **Paleta propuesta** (validar contraste):
  - Fondo espacio: `#0B0E14`
  - Superficie/regolito: grises `#2A2F3A`–`#9AA3B2`
  - Sol/energía: `#F5B700`
  - Tierra/comunicación: `#3FA7FF`
  - Bueno: `#2BD576` · Malo: `#FF4D4F` · Parcial: `#FFB020`
- **Tipografía**: una sans geométrica para títulos (p. ej. Space Grotesk / Inter) y mono para datos (JetBrains Mono).
- **Logo**: original (círculo con terminador + pequeño punto azul de la Tierra en el horizonte). **No usar** la insignia ni el "meatball" de NASA.

### 18.2 Principios de UX

1. **Respuesta en 5 segundos**: al elegir un sitio, la cabecera muestra de inmediato 4 números grandes (% luz, noche más larga, % Tierra visible, % operable) y un veredicto en lenguaje simple.
2. **Todo sincronizado** por `currentTime`.
3. **Progresividad**: modo Explorar simple; modo Planner con todos los detalles.
4. **Explicar el "por qué"**: tooltips que dicen qué montaña (azimut y distancia del obstáculo) bloquea el Sol en ese momento → usar `obstacle_distance_m` de la máscara ("El Sol se oculta tras un relieve a 37 km al azimut 212°").
5. **Contraste Tierra vs Luna**: comparaciones con la ciudad del usuario (p. ej. Ciudad de Guatemala).

### 18.3 Guion del pitch (borrador)

1. **Gancho (5 s)**: "En el polo sur de la Luna, moverte 500 metros puede significar pasar de 90% de luz a una noche de 10 días."
2. **Problema (5 s)**: la información existe, pero dispersa en herramientas para expertos; cuando una misión se retrasa, el equipo necesita respuestas rápidas.
3. **Demo (15 s)**: elegir Malapert → horizonte con Sol y Tierra → heatmap → comparar con otro sitio → simulador: "con esta fecha tu lander se queda sin energía el día 6; con un retraso de 9 días sobrevive".
4. **Credibilidad (3 s)**: datos LOLA + SPICE DE440, validado contra JPL Horizons.
5. **Cierre (2 s)**: "LUMEN: See the light. Keep the link."

⚠️ Los números del gancho deben salir de **nuestros propios cálculos** antes de usarlos.

---

## 19. Glosario

| Término | Definición |
|---|---|
| **Azimut** | Ángulo horizontal desde el norte, en sentido horario |
| **Elevación** | Ángulo sobre el horizonte matemático local (0° = plano tangente) |
| **Máscara de horizonte** | Elevación del terreno visible para cada azimut desde un punto |
| **Dip / depresión del horizonte** | Cuánto baja el horizonte geométrico por la altura del observador y la curvatura |
| **DEM / LDEM** | Modelo digital de elevación (LOLA DEM) |
| **COG** | Cloud-Optimized GeoTIFF: GeoTIFF organizado para lectura parcial por HTTP |
| **LOLA** | Lunar Orbiter Laser Altimeter, a bordo del LRO |
| **LRO** | Lunar Reconnaissance Orbiter (NASA) |
| **LROC** | Cámara del LRO (NAC: estrecha; WAC: gran angular) |
| **SPICE** | Sistema de NAIF/JPL para geometría de misiones (kernels SPK, PCK, FK, LSK) |
| **DE440** | Efeméride planetaria y lunar de JPL (2021) |
| **MOON_ME / MOON_PA** | Marcos fijos a la Luna: Mean Earth/polar axis y Principal Axes |
| **Libración** | Oscilación aparente de la Luna vista desde la Tierra (y de la Tierra vista desde la Luna) |
| **Terminador** | Línea que separa el día de la noche en la superficie |
| **PSR** | Región en sombra permanente |
| **DTE** | Direct-to-Earth: comunicación directa con la Tierra sin relé |
| **CLPS** | Commercial Lunar Payload Services (NASA) |
| **Mes sinódico** | 29.53 días; duración del día lunar |
| **SoC** | State of Charge, estado de carga de la batería |
| **DoD** | Depth of Discharge, profundidad de descarga |
| **Earthset / Earthrise** | Ocultamiento / salida de la Tierra respecto al horizonte local |
| **Sitio operable** | Instante con Sol y Tierra visibles simultáneamente |

---

## 20. Referencias y enlaces

**Reto y evento**
- Reto: https://www.spaceappschallenge.org/2026/challenges/lunar-landing-site-navigator/
- Recursos para participantes: https://www.spaceappschallenge.org/resources/
- FAQs: https://www.spaceappschallenge.org/resources/participant-faqs/
- Agencias socias 2026: https://www.spaceappschallenge.org/2026/space-agency-partners/

**Recursos oficiales del reto**
- LROC QuickMap: https://quickmap.lroc.asu.edu/
- Moon Trek: https://trek.nasa.gov/moon/
- JPL Horizons: https://ssd.jpl.nasa.gov/horizons/ · API: https://ssd-api.jpl.nasa.gov/doc/horizons.html
- CSA Moon Exploration: https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/

**Topografía**
- PGDA – South Pole Landing Site LOLA DEMs: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/
- README: https://core2.gsfc.nasa.gov/PGDA/LOLA_5mpp/README
- Mosaico 87–90°S 5 m/px: https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ · https://pgda.gsfc.nasa.gov/products/81
- High-Resolution LOLA Topography for South Pole Sites: https://pgda.gsfc.nasa.gov/products/78
- Enhanced Topography (Shape-from-Shading): https://pgda.gsfc.nasa.gov/products/104
- LOLA PDS Archive (MIT): https://imbrium.mit.edu/

**Efemérides**
- NAIF generic kernels: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/
- PCK readme: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/aareadme.txt
- Frame kernels lunares: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/fk/satellites/
- Tutoriales SPICE: https://naif.jpl.nasa.gov/naif/tutorials.html
- SpiceyPy: https://github.com/AndrewAnnex/SpiceyPy
- Skyfield (marcos planetarios): https://rhodesmill.org/skyfield/planetary.html

**3D**
- Cesium Moon: https://cesium.com/platform/cesium-ion/content/cesium-moon/
- Blog de lanzamiento: https://cesium.com/blog/2024/08/06/introducing-cesium-moon-terrain/
- Resium: https://resium.reearth.io/

**Misiones / sitios**
- NASA – Artemis III landing regions: https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/
- Planetary Society – Chang'e-7: https://www.planetary.org/space-missions/change-7
- Wikipedia – Chang'e 7: https://en.wikipedia.org/wiki/Chang%27e_7

**Artículos científicos**
- Mazarico, E., et al. (2011). Illumination conditions of the lunar polar regions using LOLA topography. *Icarus*, 211(2), 1066–1081. doi:10.1016/j.icarus.2010.10.030
- Barker, M. K., et al. (2021). Improved LOLA elevation maps for south pole landing sites: Error estimates and their impact on illumination conditions. *Planetary and Space Science*. doi:10.1016/j.pss.2020.105119
- Park, R. S., et al. (2021). The JPL Planetary and Lunar Ephemerides DE440 and DE441. *The Astronomical Journal*, 161(3), 105.

---

## 21. Preguntas abiertas y decisiones pendientes

| # | Pregunta | Responsable | Default si no se decide |
|---|---|---|---|
| Q1 | Fecha límite exacta de entrega y formato (video vs slides) | Producto | Leer guía en Fase 0 |
| Q2 | ¿Cuántos integrantes y quién toma cada rol? | Equipo | Tabla 16.1 |
| Q3 | Hosting del motor (Fly/Render/VM propia) | Backend | Fly.io o Render |
| Q4 | ¿Arq o RQ para jobs? | Backend | arq (async, encaja con FastAPI) |
| Q5 | ¿D3 o ECharts para el polar? | Front Charts | D3 (control total de la escala no lineal) |
| Q6 | Altura del observador por defecto (2 m) | Ciencia | 2 m, configurable |
| Q7 | Umbral de visibilidad del Sol (centro vs fracción > 0) | Ciencia | Centro visible (fracción ≥ 0.5) |
| Q8 | Rango temporal por defecto | Producto | Próximos 12 meses desde hoy, paso 30 min |
| Q9 | ¿Idioma principal de la UI? | Producto | Inglés para jueces + ES vía i18n |
| Q10 | ¿Incluir incertidumbre con clones (M12.x)? | Geo | Solo si sobra tiempo |
| Q11 | ¿Dominio propio? | Producto | Subdominio de Vercel |

---

## 22. Anexos

### Anexo A — Checklist de verificación de ⚠️

Antes de la entrega, revisar y tachar:
- [ ] Criterios de evaluación y formato de entrega 2026 (sección 3).
- [ ] Proyección exacta de cada GeoTIFF (sección 4.7, 8.1).
- [ ] Nombres de productos DEM polares de 20 m+ en imbrium (8.1).
- [ ] Versión vigente de LSK y FK lunar (8.2).
- [ ] Parámetros exactos de Horizons API para observador lunar (8.2).
- [ ] Asset ID y plan de Cesium Moon; API `Ellipsoid` en la versión de CesiumJS (8.3, 12.2).
- [ ] ID del CGI Moon Kit en SVS (8.3).
- [ ] Coordenadas de todos los sitios del catálogo (13).
- [ ] Estado actual de Artemis y Chang'e-7 (13).
- [ ] Valores de libración y ciclo estacional (4.1, 4.2).
- [ ] Números usados en el pitch (18.3).

### Anexo B — Ejemplo mínimo de cálculo (para Fase 1)

```python
# notebooks/01_poc.py — prueba de concepto mínima
import numpy as np, spiceypy as sp, rasterio
from pyproj import CRS, Transformer

R = 1_737_400.0
for k in ["naif0012.tls","de440s.bsp","moon_pa_de440_200625.bpc","moon_de440_220930.tf","pck00011.tpc"]:
    sp.furnsh(f"kernels/{k}")

lat, lon, h_obs = -89.45, -137.31, 2.0     # ⚠️ coordenadas de ejemplo, verificar

# 1) Terreno
stere = CRS.from_proj4("+proj=stere +lat_0=-90 +lon_0=0 +k=1 +x_0=0 +y_0=0 +R=1737400 +units=m +no_defs")
geo   = CRS.from_proj4("+proj=longlat +R=1737400 +no_defs")
to_xy = Transformer.from_crs(geo, stere, always_xy=True)
# ... abrir COG con rasterio, leer ventana, función sample_bilinear(lat, lon)

# 2) Horizonte (ver 9.3)
# mask_el, mask_dist = horizon_mask(...)

# 3) Efemérides
times = np.arange(np.datetime64("2027-01-01"), np.datetime64("2028-01-01"), np.timedelta64(30, "m"))
ets = [sp.str2et(str(t)) for t in times]
h0 = 0.0  # altura del terreno en el sitio (del DEM)
obspos = sp.latrec((R + h0 + h_obs)/1000.0, np.radians(lon), np.radians(lat))

def azel(target):
    az = np.empty(len(ets)); el = np.empty(len(ets)); dist = np.empty(len(ets))
    for i, et in enumerate(ets):
        st, _ = sp.azlcpo("ELLIPSOID", target, et, "LT+S", False, True, obspos, "MOON", "MOON_ME")
        dist[i], az[i], el[i] = st[0], np.degrees(st[1]), np.degrees(st[2])
    return az % 360, el, dist

sun_az, sun_el, sun_d = azel("SUN")
ear_az, ear_el, ear_d = azel("EARTH")

# 4) Visibilidad (ver 9.5) y 5) métricas (ver 9.6)
```

### Anexo C — Tabla de trazabilidad Idea → Requisito → Módulo

| Idea original del equipo | Objetivos del reto | Historias | Módulos |
|---|---|---|---|
| 1. Visor de horizonte lunar | O3, O4, O5 | HU-02, HU-06 | M2, M7 |
| 2. Línea de tiempo energía/comunicación | O2, O4, O6 | HU-03 | M3 |
| 3. Comparador de sitios lado a lado | O1, O2, O4 | HU-04 | M5, M6 |
| 4. Globo lunar 3D interactivo | O1, O5, O6, O7 | HU-05 | M4, M10 |
| (Nuevo) Coordenadas personalizadas | O1 | HU-01 | M1 + motor |
| (Nuevo) Simulador de batería | O4 | HU-07 | M8 |
| (Nuevo) What-if de retraso | O2 (+ Background) | HU-08 | M9 |
| (Nuevo) Mejor punto cercano | O1 (+ Background) | HU-09 | M12 |
| (Nuevo) Modo Explorar | O7 | HU-11 | M11 |
| (Nuevo) Validación | Validity | HU-13 | M15 |

---

*Fin del documento. Mantener actualizado con cada decisión.*
