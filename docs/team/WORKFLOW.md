# Flujo de trabajo

## Ramas

- `main`: siempre desplegable. **Protegida**: sin push directo, PR obligatorio, 1 aprobación (CODEOWNER), CI verde.
- Rama por tarea, corta (≤ 3 días), desde `main` actualizado:

```
<tipo>/<modulo>-<descripcion-corta>
feat/m2-horizon-polar
feat/engine-horizon-raycast
fix/m3-heatmap-utc-offset
docs/methodology-disk-fraction
chore/ci-cache-uv
```

Tipos: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`. Módulo: `m1`…`m19`, `engine`, `web`, `infra`, `data`.

## Ciclo de una tarea

1. Tomar un issue del tablero (o crearlo con la plantilla). Asignártelo. Un issue = una rama = un PR.
2. `git switch main && git pull && git switch -c feat/m2-horizon-polar`
3. Trabajar **solo** en las carpetas de tu rol (`docs/team/ROLES.md`). Si necesitas tocar otra área, abre un issue o pide al owner.
4. Commits con Conventional Commits (ver `CONVENTIONS.md`).
5. Antes del PR: `git fetch && git rebase origin/main`, correr checks locales (ver abajo).
6. Abrir PR (plantilla), enlazar issue (`Closes #N`), pedir review al CODEOWNER.
7. Merge con **Squash and merge**. Borrar la rama.

## Checks locales antes de abrir PR

```bash
# Frontend (desde la raíz)
pnpm lint && pnpm typecheck && pnpm test && pnpm build

# Motor (desde services/engine)
uv run ruff check . && uv run ruff format --check . && uv run mypy lumen_engine tests && uv run pytest

# Contratos (si tocaste proto/)
pnpm proto:lint && pnpm proto:gen
```

## Cambios de contrato (`proto/`, ADR-0012)

1. PR con label `contract` que modifica `proto/lumen/v1/*.proto`. Reviewers: owner del área + quien consume ese servicio (CODEOWNERS asigna al owner).
2. En el **mismo PR**: `pnpm proto:lint && pnpm proto:gen` y commit del código generado (`packages/sdk/src/gen`, `services/engine/gen`).
3. Si el RPC lo consume la UI, actualizar su mock en `packages/sdk/src/mocks/` en el mismo PR.
4. Cambios incompatibles (borrar/renumerar campos, cambiar tipos) los bloquea `buf breaking` en CI. Si es inevitable: campo nuevo + `deprecated`, nunca reutilizar números.
5. **2 aprobaciones** de personas distintas al autor (una de un rol afectado). Nadie mergea su propio PR de contrato.

## Paralelismo sin bloqueos

- Frontend avanza con los **mocks del SDK** (`NEXT_PUBLIC_ENGINE_MOCK=1`): mismos tipos y servicios que el motor real. **Nunca** datos de ejemplo dentro de `apps/web`.
- Motor expone todos los servicios desde el día 1; los RPC sin lógica responden `unimplemented` (HTTP 501).
- Cada módulo de dominio del motor es independiente (`dem`, `horizon`, `ephem`, `visibility`, `metrics`, `power`, `search`); `analysis/pipeline.py` (R1) solo los compone.

## Ritmo

- **Daily** asíncrono (canal del equipo): ayer / hoy / bloqueos.
- **Integración** 2×/semana, **rotativa** (cada vez una persona distinta, en orden R1→R7): actualiza su copia de `main`, la prueba end-to-end y reporta en el canal.
- **Freeze** de features antes de la Fase 5 (riesgo R7): después solo fixes, validación y pulido.

## Definition of Done (14.5)

- PR aprobado por el CODEOWNER; CI verde.
- Tests nuevos para la lógica; cobertura de cálculo ≥ 80%.
- Tipos regenerados si cambió la API.
- UI accesible por teclado, textos en EN (UI) y ES vía i18n cuando exista.
- `docs/` actualizado si cambia metodología; doc maestro actualizado si cambia alcance.
