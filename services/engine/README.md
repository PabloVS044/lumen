# LUMEN Engine

Motor de cálculo en Python (connect-python sobre Starlette). Ver `CLAUDE.md` en esta carpeta y la sección 9–11 de `docs/LUMEN_documento_tecnico.md`.

```bash
uv sync --all-extras          # instala todo (ciencia, geo, infra, dev)
uv run uvicorn lumen_engine.main:app --reload --port 8000
uv run pytest
uv run ruff check . && uv run ruff format --check . && uv run mypy lumen_engine tests
```

Contrato: `proto/lumen/v1/*.proto` (raíz del repo). Código generado en `gen/` con `pnpm proto:gen`.
Protocolo Connect: `POST /lumen.v1.<Service>/<Method>` con JSON (`Connect-Protocol-Version: 1`).

```bash
curl -s -H 'content-type: application/json' -d '{}' localhost:8000/lumen.v1.HealthService/Check
```
