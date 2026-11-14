## Qué cambia

<!-- 1–3 líneas. Enlaza el issue. -->

Closes #

**Módulo:** M? · **Rol:** R? · **Sección del doc:** ?

## Cómo probarlo

<!-- Comandos o pasos concretos. Capturas para UI. -->

## Checklist (Definition of Done, sección 14.5)

- [ ] Solo toqué carpetas de mi rol, o el owner de la otra área está como reviewer
- [ ] CI verde localmente (`pnpm lint typecheck test build` / `ruff`, `mypy`, `pytest`)
- [ ] Tests para la lógica nueva
- [ ] Si cambié `proto/`: label `contract`, `pnpm proto:lint && pnpm proto:gen` incluido, mock del SDK actualizado
- [ ] Sin datos de ejemplo en `apps/web` (mocks solo en `@lumen/sdk/mocks`)
- [ ] Convenciones de unidades: UTC, grados, azimut N horario, lon [-180, 180)
- [ ] UI: navegable por teclado, resumen textual del gráfico, tokens de color (sin hex sueltos)
- [ ] Docs actualizadas si cambia metodología o alcance
