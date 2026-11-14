# Convenciones

## Dominio (sección 0 del doc, no negociables)

- Tiempo interno **UTC ISO 8601**. La UI puede mostrar local además de UTC.
- Ángulos en **grados**. Azimut desde el **norte, horario** (N=0, E=90, S=180, W=270).
- Longitud **este positiva**, API en **[-180, 180)**; la UI acepta 0–360 y convierte (`lib/coords.ts`).
- Latitud sur negativa. Distancias en metros. Radio lunar `R = 1 737 400 m`.
- Marco fijo **MOON_ME** en todo el motor. Constantes solo desde `lumen_engine/core/constants.py`.
- Datos dudosos se marcan `⚠️ VERIFICAR` hasta confirmarlos con fuente primaria.

## Commits — Conventional Commits

```
<tipo>(<scope>): <resumen en imperativo, minúsculas, ≤ 72 chars>

<cuerpo opcional: por qué, no qué>

Closes #12
```

Scopes: `horizon`, `ephem`, `visibility`, `metrics`, `power`, `search`, `dem`, `api`, `jobs`, `db`,
`globe`, `timeline`, `compare`, `site-picker`, `learn`, `ui`, `types`, `infra`, `ci`, `docs`, `catalog`.

Ejemplos: `feat(horizon): add multi-layer bilinear sampling`, `fix(timeline): render hours in UTC`.

## Protobuf (contratos)

- Paquete `lumen.v1`, un `.proto` y un `service` por área. Estilo `buf lint` STANDARD, formato `buf format`.
- Comentario en cada campo cuyo significado, unidad o default no sea obvio. Unidades en el nombre (`_deg`, `_m`, `_km`, `_h`, `_pct`).
- Reglas de rango con `buf.validate` en el propio campo.
- proto3: 0 = "usar default" (documentarlo). Usar `optional` cuando 0 sea un valor válido distinto del default.
- Enums con `*_UNSPECIFIED = 0`. Nunca reutilizar ni renumerar campos.

## Python (motor)

- Python 3.12, gestor `uv`. `ruff` (lint + format, 100 cols) y `mypy --strict` deben pasar.
- Funciones de cálculo **puras** y vectorizadas con numpy; I/O separado (dem lee, horizon calcula).
- En la frontera se usan mensajes protobuf generados (`from lumen.v1 import x_pb2`); los servicios viven en `lumen_engine/services/<area>.py`.
- Los módulos lanzan `EngineError` (o subclases); el interceptor los convierte en error Connect + `ErrorDetail`.
- Docstring con la sección del doc que implementa (`Sección 9.5`).
- Tests en `tests/unit` (puros), `tests/api` (RPC Connect vía fixture `rpc`), `tests/validation` (contra Horizons con fixtures grabadas). Sin red en CI.

## TypeScript (web)

- TS estricto (`noUncheckedIndexedAccess`). Sin `any`.
- Archivos `kebab-case.tsx`, componentes `PascalCase`, hooks `useCamelCase`.
- Datos del motor **solo** con `useQuery(Service.method.x, input)` de `@connectrpc/connect-query` y tipos de `@lumen/sdk`; nunca `fetch` en componentes.
- **Prohibido** hardcodear datos de ejemplo en la UI: los mocks viven en `@lumen/sdk/mocks`.
- Formularios: validar con `validateMessage(Schema, msg)` del SDK (mismas reglas que el motor).
- Estado compartible en URL (`nuqs`, `lib/url-state.ts`); estado efímero de UI en Zustand (`stores/`).
- Colores solo con tokens de `globals.css` (`text-sun`, `bg-earth`…). Nada de hex sueltos.
- Cesium solo en cliente con `next/dynamic` y `ssr: false`.
- Accesibilidad: cada gráfico tiene resumen textual (12.5); paletas aptas para daltonismo.

## Diseño

- Sol = dorado (energía), Tierra = azul (comunicación) en toda la UI.
- Sin logo ni insignia de NASA en la marca.
- Skills de diseño disponibles en `.claude/skills` (ver `docs/team/SKILLS.md`).
