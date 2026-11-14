# ADR-0011 · Ownership por carpeta y contrato API primero

**Estado:** aceptada · 2026-11-14

## Contexto

7 personas trabajan en paralelo sobre un motor Python y un frontend Next.js. Riesgo: conflictos de merge y desincronización front/back.

## Decisión

- Cada carpeta tiene un único owner (`.github/CODEOWNERS`, `docs/team/ROLES.md`).
- El contrato (`proto/`, ver ADR-0012) se define completo desde el día 1; los RPC sin lógica responden `unimplemented`.
- Un `.proto`, un servicio Connect y un módulo de dominio por área; `analysis/pipeline.py` solo compone.
- Frontend trabaja con los mocks del SDK hasta que el motor responda.

## Consecuencias

- Menos conflictos; cambios de contrato con 2 aprobaciones entre pares, sin un único aprobador.
- Coste: cambios de contrato requieren coordinación explícita (label `contract`).
