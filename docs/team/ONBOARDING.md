# Onboarding (30 min)

## 1. Requisitos

| Herramienta | Versión       | Instalar                                           |
| ----------- | ------------- | -------------------------------------------------- |
| Node        | 22 (`.nvmrc`) | `nvm install`                                      |
| pnpm        | 11            | `corepack enable`                                  |
| Python      | 3.12 (vía uv) | —                                                  |
| uv          | ≥ 0.5         | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker      | reciente      | para Postgres + Redis                              |

## 2. Arranque

```bash
git clone git@github.com:PabloVS044/lumen.git && cd lumen
cp .env.example .env
pnpm install                       # web + tipos (copia assets de Cesium)
cd services/engine && uv sync --all-extras && cd ../..
bash data/scripts/download_kernels.sh   # kernels SPICE (~50 MB): el motor no arranca sin ellos
# DEM (data/local/, ignorado por git): sin él, ListEvents/Analyze fallan con NO_COVERAGE y /health sale DEGRADED
services/engine/.venv/bin/python data/scripts/prepare_dem.py   # Site01 5 m + polar 80 m (cientos de MB; ver data/scripts/README.md)
docker compose -f infra/docker-compose.yml up -d db redis
```

Dos terminales:

```bash
cd services/engine && uv run uvicorn lumen_engine.main:app --reload --port 8000   # http://localhost:8000/docs
pnpm dev                                                                         # http://localhost:3000
```

Sin motor corriendo: `NEXT_PUBLIC_ENGINE_MOCK=1 pnpm dev` (mocks del SDK).

Contratos: `proto/lumen/v1/*.proto`. Tras editarlos: `pnpm proto:gen` (buf viene como devDependency).

## 3. Lectura obligatoria

1. `docs/LUMEN_documento_tecnico.md` secciones **0, 1, 2, 4** (todos) + las secciones de tu rol (ver `ROLES.md`).
2. `docs/team/ROLES.md` → qué carpetas son tuyas.
3. `docs/team/WORKFLOW.md` y `CONVENTIONS.md`.
4. `CLAUDE.md` (raíz) si usas un asistente de código: contiene el contexto condensado y las reglas.

## 4. Primer día por rol

| Rol | Tarea                                                                          |
| --- | ------------------------------------------------------------------------------ |
| R1  | Protección de `main`, labels, tablero, cuentas de hosting                      |
| R2  | Descargar 1 DEM LOLA 5 m de sitio + 1 capa polar gruesa; notebook de horizonte |
| R3  | Kernels SPICE; az/el Sol y Tierra para 1 sitio; comparar con Horizons          |
| R4  | Cuenta Cesium ion; globo lunar en `/explore`                                   |
| R5  | `<HorizonPolar />` con el mock del SDK                                         |
| R6  | Maqueta de `<CompareTable />` con `Compare` mock del SDK                       |
| R7  | Participant Guide 2026 → actualizar sección 3; verificar 3 sitios del catálogo |
