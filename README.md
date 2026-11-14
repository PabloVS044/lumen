# LUMEN

**Lunar Utility Map for Energy & Networks** — _See the light. Keep the link._

Web app para el NASA International Space Apps Challenge 2026 (reto _Lunar Landing Site Navigator_): compara
sitios de aterrizaje lunares y fechas según la luz solar y la visibilidad directa de la Tierra, calculadas sobre
el horizonte real del terreno (LOLA) con efemérides SPICE DE440.

## Estructura

```
apps/web/          Next.js 16 — UI (globo 3D, horizonte, timeline, comparador)
services/engine/   connect-python — motor de cálculo (horizonte, efemérides, visibilidad, métricas)
proto/             Contratos front ↔ back (Protobuf + ConnectRPC, ADR-0012)
packages/sdk/      SDK TS generado desde proto/ + mocks para desarrollo sin motor
data/              Catálogo de sitios, scripts de descarga (DEM, kernels), notebooks
infra/             docker-compose para desarrollo
docs/              Documento técnico maestro, equipo, ADRs, metodología, validación
```

## Empezar

Ver [docs/team/ONBOARDING.md](docs/team/ONBOARDING.md).

```bash
pnpm install && pnpm dev                                   # http://localhost:3000
cd services/engine && uv sync --all-extras && uv run uvicorn lumen_engine.main:app --reload
```

## Documentación

- [Documento técnico maestro](docs/LUMEN_documento_tecnico.md) — fuente única de verdad
- [Roles y ownership](docs/team/ROLES.md) · [Flujo de trabajo](docs/team/WORKFLOW.md) · [Convenciones](docs/team/CONVENTIONS.md) · [Roadmap](docs/team/ROADMAP.md)

## Datos y atribución

NASA LRO/LOLA (PGDA, PDS), NAIF SPICE, JPL Horizons, Cesium Moon, CSA. Detalle en `/about` y en la sección 8 del documento técnico.
