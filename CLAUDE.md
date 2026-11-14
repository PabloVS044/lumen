# LUMEN — contexto del proyecto

**LUMEN** (_Lunar Utility Map for Energy & Networks_, "See the light. Keep the link.") es una web app para el
**NASA Space Apps Challenge 2026, reto "Lunar Landing Site Navigator"**. Para cualquier coordenada lunar
(énfasis en el polo sur) y rango de fechas, calcula y visualiza cuándo hay **Sol** (energía) y **Tierra**
(comunicación directa, DTE) sobre el horizonte **real** del terreno, y permite comparar sitios y fechas
rápidamente (caso típico: "la misión se retrasó, ¿y ahora?").

**Fuente única de verdad:** `docs/LUMEN_documento_tecnico.md` (~1800 líneas). No lo cargues entero: usa el
mapa de abajo y lee la sección que toque **antes** de implementar. Si algo aquí contradice el doc, gana el doc.

## Por qué es difícil (sección 4)

- Eje lunar inclinado ~1.54° → en el polo el Sol roza el horizonte (−1.5°…+1.5°): una montaña a decenas de km decide si hay luz. Picos con luz casi eterna vs cráteres en sombra permanente (PSR).
- Día lunar = 29.53 días. La Tierra casi no se mueve en el cielo (libración ±7–8°): en el polo sur está cerca del horizonte norte y la comunicación aparece/desaparece.
- Sin atmósfera: sin refracción. Horizonte = máx. elevación del terreno por azimut, **con curvatura** (100 km ⇒ ~2.9 km de caída).
- Discos: Sol ~0.53°, Tierra ~1.9° → se calcula **fracción visible**. Eclipses (Tierra tapa al Sol) quitan energía.

## Arquitectura (secciones 7, 10)

```
                     proto/lumen/v1/*.proto  (contrato único, buf + protovalidate — ADR-0012)
                       │ pnpm proto:gen
          ┌────────────┴─────────────┐
packages/sdk (@lumen/sdk)            services/engine/gen (pb2 + connect-python)
  tipos · clientes · mocks                    │
          │                                   │
apps/web (Next.js 16, React 19, TS) ──Connect/JSON──► /api/engine BFF ──► services/engine (Starlette + connect-python, Py 3.12, uv)
  connect-query + TanStack Query                                         dem → horizon (ray-casting numba sobre DEM LOLA COG)
  Cesium (globo) · D3 (polar) · ECharts                                  ephem (SPICE DE440, MOON_ME) → visibility → metrics
  nuqs (URL) · Zustand                                                   power · search · jobs (arq+Redis) · db (Postgres)
```

La API REST de la sección 10 del doc se implementa como **servicios Connect** con los mismos datos
(`POST /lumen.v1.<Service>/<Method>`). Equivalencias: `/v1/analyze` → `AnalysisService.Analyze`,
`/v1/horizon` → `HorizonService.ComputeHorizon`, `/v1/ephemeris` → `EphemerisService.GetSeries`, etc.

Pipeline de análisis (9.1): `coverage → terreno → máscara de horizonte (cacheada por sitio) → az/el Sol y Tierra →
fracción de disco − eclipse → métricas → eventos`.

## Mapa del documento técnico

| Necesitas…                                                                                                                                                 | Sección  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Objetivos del reto O1–O7 y checklist                                                                                                                       | 2.4, 2.5 |
| Criterios de evaluación / entrega Space Apps                                                                                                               | 3        |
| Ciencia: polo sur, libración, dip, discos, eclipses, energía, marcos ME/PA                                                                                 | 4        |
| Historias de usuario HU-01…HU-13 con criterios de aceptación                                                                                               | 5.3      |
| Módulos M1–M19 y prioridad (🎯 MVP / 🚀 / 🧪)                                                                                                              | 6        |
| Stack, ADRs, estructura del monorepo                                                                                                                       | 7        |
| DEMs, kernels SPICE, Cesium, catálogo de fuentes, licencias                                                                                                | 8        |
| Algoritmos: geometría 9.2, horizonte 9.3, efemérides 9.4, visibilidad 9.5, métricas 9.6, score 9.7, batería 9.8, what-if 9.9, mejor punto 9.10, globo 9.11 | 9        |
| Endpoints y esquemas (hoy: servicios Connect en `proto/`)                                                                                                  | 10       |
| Caché, tablas SQL, object storage                                                                                                                          | 11       |
| Páginas, componentes, estado en URL, accesibilidad                                                                                                         | 12       |
| Catálogo de sitios                                                                                                                                         | 13       |
| Validación y tests                                                                                                                                         | 14       |
| Infra, CI, convenciones de repo                                                                                                                            | 15       |
| Roles, fases, dependencias                                                                                                                                 | 16       |
| Riesgos                                                                                                                                                    | 17       |
| Marca, paleta, principios UX, pitch                                                                                                                        | 18       |

## Convenciones no negociables

- UTC ISO 8601 · grados · azimut desde el norte en sentido horario · longitud este positiva en **[-180, 180)** en la API (UI acepta 0–360) · latitud sur negativa · metros · `R = 1 737 400 m` · marco **MOON_ME**.
- Constantes solo en `services/engine/lumen_engine/core/constants.py`.
- Datos sin confirmar se marcan `⚠️ VERIFICAR`. Nunca inventar coordenadas, cifras o fuentes; los números del pitch salen de nuestros cálculos.
- No usar logo/insignia de NASA en la marca.

## Equipo y límites (leer antes de editar)

7 roles con ownership por carpeta: `docs/team/ROLES.md` y `.github/CODEOWNERS`.
**Antes de editar un archivo, comprueba a qué rol pertenece.** Si la tarea es de un rol y el archivo es de
otro, no lo edites: propón el cambio (issue/PR) o detente y avisa.

Sin jerarquía: todos los roles son pares. Zona compartida (PR `contract` con 2 aprobaciones, una de un rol afectado): `proto/**`, código generado
(`packages/sdk/src/gen/**`, `services/engine/gen/**`: nunca a mano, solo `pnpm proto:gen`),
`packages/sdk/**`, `apps/web/lib/api/**`, `apps/web/stores/**`, `apps/web/lib/url-state.ts`, `apps/web/app/globals.css`.

**Contratos y mocks (reglas duras, ADR-0012):**

- Todo dato que cruza front ↔ back se define en `proto/lumen/v1/<area>.proto`. Nada de tipos a mano para eso.
- Datos de ejemplo/mock **solo** en `packages/sdk/src/mocks/` (o en el motor). **Nunca** hardcodeados en `apps/web`.
- Rangos y reglas en el `.proto` con `buf.validate`; el motor los aplica en un interceptor y la UI con `validateMessage()`.

Flujo: rama `tipo/modulo-desc` → Conventional Commits → PR con plantilla → squash. Detalles: `docs/team/WORKFLOW.md`,
`docs/team/CONVENTIONS.md`.

## Comandos

```bash
pnpm install && pnpm dev                     # web en :3000 (NEXT_PUBLIC_ENGINE_MOCK=1 sin motor)
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm proto:lint && pnpm proto:gen          # tras cambiar proto/
cd services/engine && uv sync --all-extras
uv run uvicorn lumen_engine.main:app --reload --port 8000
uv run ruff check . && uv run ruff format --check . && uv run mypy lumen_engine tests && uv run pytest
```

## Forma de trabajar

- Para trabajo no trivial: plan breve → tests primero → implementación → verificación con los comandos de arriba antes de decir "listo".
- Skills del repo en `.claude/skills` (`docs/team/SKILLS.md`): `test-driven-development`, `systematic-debugging`, `verification-before-completion`, `anti-slop` (todos); `ui-ux-pro-max`, `impeccable`, `design-taste-frontend` (frontend/diseño).
- RPCs sin implementar responden `unimplemented` (501). Implementar = rellenar el servicio en `services/engine/lumen_engine/services/<area>.py` sin tocar el `.proto` salvo PR `contract`.
- Next.js 16 tiene APIs nuevas: lee `apps/web/AGENTS.md` y `apps/web/node_modules/next/dist/docs/` antes de usar APIs de Next.
- Sin atribuciones automáticas (co-autores, "generated with") en commits, PRs ni código.
