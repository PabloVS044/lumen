# services/engine — LUMEN Engine

Python 3.12 (uv) + **connect-python** sobre Starlette. Secciones 9 (algoritmos), 10 (API), 11 (caché/BD) y 14 (validación) del doc técnico.
Contrato: `proto/lumen/v1/*.proto` en la raíz (ADR-0012). Código generado en `gen/` (`lumen.v1.*_pb2`, `*_connect`) — no editar; `pnpm proto:gen` en la raíz.

## Estructura y owners

| Ruta | Qué | Owner |
|---|---|---|
| `main.py`, `rpc/`, `services/{health,sites,analysis,stubs}.py`, `analysis/`, `core/`, `jobs/`, `db/`, `catalog/` | app ASGI, interceptores, pipeline, config, errores, jobs, BD | R1 |
| `dem/`, `horizon/`, `search/`, `services/{terrain,horizon,search}.py` | DEM COG, ray-casting, mejor punto | R2 |
| `ephem/`, `visibility/`, `metrics/`, `power/`, `services/{ephemeris,power,whatif,validation}.py` | SPICE, fracción de disco, métricas, batería, what-if | R3 |

## Reglas

- Un servicio por área: `services/<area>.py` hereda el stub generado (`from lumen.v1.x_connect import XService`). Métodos no implementados → el stub responde `unimplemented`. Servicios aún vacíos viven en `services/stubs.py`; al implementarlos se mueven a su archivo.
- Validación de entrada: automática (`rpc/interceptors.py` + reglas `buf.validate` del `.proto`). No revalidar rangos a mano.
- Errores de dominio: `core/errors.py` (`EngineError` y subclases) → error Connect + `lumen.v1.ErrorDetail{code}`.
- proto3: un campo numérico en 0 significa "default"; usar `core/defaults.py`.
- Lógica de cálculo **pura** y vectorizada (numpy/numba) en los módulos de dominio; los servicios solo traducen proto ↔ dominio.
- Constantes desde `core/constants.py`. Marco MOON_ME. Aberración LT+S.
- Tests: `tests/unit` (puros, hypothesis), `tests/api` (RPC Connect JSON con la fixture `rpc`), `tests/validation` (vs Horizons con datos grabados; `@pytest.mark.network` si usa red). CI sin red.
- Extras: `science` (spiceypy, numba, scipy), `geo` (rasterio, pyproj), `infra` (sqlalchemy, arq, redis). `uv sync --all-extras`.

## Comandos

```bash
uv run uvicorn lumen_engine.main:app --reload --port 8000
uv run ruff check . && uv run ruff format --check . && uv run mypy lumen_engine tests && uv run pytest
curl -s -H 'content-type: application/json' -d '{}' localhost:8000/lumen.v1.HealthService/Check
```
