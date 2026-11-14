# ADR-0012 · Contratos en Protobuf + ConnectRPC; mocks solo en el SDK

**Estado:** aceptada · 2026-11-14 · **Reemplaza:** ADR-09 (tipos desde OpenAPI) y la API REST de la sección 10.

## Contexto

El contrato front/back debe ser único, tipado en TS y Python, validado igual en ambos lados y difícil de romper
sin darse cuenta. Con 7 personas en paralelo, el frontend necesita datos antes de que el motor exista.

## Decisión

- **Fuente de verdad:** `proto/lumen/v1/*.proto` (un archivo por área, un `service` por área).
- **Protocolo:** [Connect](https://connectrpc.com/) sobre HTTP (`POST /lumen.v1.<Service>/<Method>`, JSON en dev y prod; binario opcional). Compatible con gRPC si hiciera falta.
- **Validación:** reglas `buf.validate` en el `.proto`. Motor: `protovalidate` en un interceptor (→ `invalid_argument`). Web: `validateMessage()` del SDK para formularios.
- **Errores:** códigos Connect + `lumen.v1.ErrorDetail { code }` con códigos de dominio estables (`NO_COVERAGE`, `SITE_NOT_FOUND`, `VALIDATION_ERROR`...).
- **Generación** (`pnpm proto:gen`, `buf.gen.yaml`): TS (protobuf-es v2) → `packages/sdk/src/gen`; Python (protobuf + pyi + connect-python) → `services/engine/gen`. Lo generado se commitea y CI verifica que esté al día.
- **SDK** `@lumen/sdk`: tipos, `createLumenClient`, `createLumenTransport`, errores y validación. React usa `@connectrpc/connect-query` con el transporte del SDK.
- **Mocks:** solo en `@lumen/sdk/mocks` (transporte en memoria con datos sintéticos, `meta.engineVersion = "mock"`). `NEXT_PUBLIC_ENGINE_MOCK=1` lo activa. **Prohibido** definir datos de ejemplo en `apps/web`.
- **CI** (`proto.yml`): `buf lint`, `buf format`, `buf breaking` contra `main` (regla `WIRE_JSON`) y código generado al día.

## Alternativas

- REST + OpenAPI generado desde Pydantic (ADR-09 original): contrato definido por el backend, validación duplicada, sin detección de cambios incompatibles.
- gRPC puro: no funciona directo desde el navegador sin proxy gRPC-Web.

## Consecuencias

- Contrato agnóstico de lenguaje, cambios incompatibles detectados en CI.
- Pierde Swagger: la documentación es el `.proto` (comentarios obligatorios en campos no obvios).
- Python: el motor usa mensajes protobuf en la frontera; la lógica interna sigue con numpy.
- Reglas proto3: campos numéricos en 0 significan "usar el default" documentado en el comentario del campo.
