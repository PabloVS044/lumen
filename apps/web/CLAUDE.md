@AGENTS.md

# apps/web

Frontend Next.js 16 (App Router, `cacheComponents` activo). Ver sección 12 del documento técnico.

- Rutas: `/` landing · `/explore` globo · `/site` detalle (pestañas) · `/compare` · `/search` · `/learn` · `/validation` · `/about` · `/api/engine/[...path]` BFF (proxy Connect).
- Componentes por módulo en `components/<area>/`; owner en el comentario de cabecera de cada archivo y en `docs/team/ROLES.md`.
- **Datos:** `useQuery(Service.method.x, input)` de `@connectrpc/connect-query` con descriptores y tipos de `@lumen/sdk`. Ejemplo: `components/site-picker/site-picker.tsx`. Nunca `fetch` directo.
- **Mocks:** `NEXT_PUBLIC_ENGINE_MOCK=1` cambia el transporte a `@lumen/sdk/mocks`. **Prohibido** escribir datos de ejemplo en esta app; si falta un mock, se agrega en `packages/sdk/src/mocks/`.
- Errores: `engineErrorCode(err)` del SDK devuelve el código de dominio (`NO_COVERAGE`, `SITE_NOT_FOUND`…).
- Formularios: `validateMessage(Schema, msg)` aplica las mismas reglas `buf.validate` que el motor.
- Mensajes protobuf-es v2: crear con `create(Schema, {...})`; timestamps con `timestampFromDate`/`timestampDate` (`@bufbuild/protobuf/wkt`).
- Estado: compartible → `lib/url-state.ts` (nuqs); efímero → `stores/scenario-store.ts` (Zustand). Todas las vistas se sincronizan por `currentTime`.
- Hooks de nuqs y `useSearchParams` van dentro de `<Suspense>` (requisito de Cache Components).
- Cesium: solo cliente vía `components/globe/globe-loader.tsx`; assets en `public/cesium` (postinstall, ignorado por git).
- Estilo: tokens de `app/globals.css` (`text-sun`, `text-earth`, `bg-space`, `text-good/bad/partial`). Sol dorado = energía, Tierra azul = comunicación.
- Gráficos: escala de elevación no lineal (todo pasa entre −3° y +10°), resumen textual accesible, paleta apta para daltonismo.
- Tests: Vitest junto al archivo (`*.test.ts(x)`); E2E Playwright (pendiente).
