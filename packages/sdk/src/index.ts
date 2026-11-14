/**
 * @lumen/sdk — única puerta del frontend al motor (ADR-0012). Compartido: todo el equipo.
 *
 * - Tipos y descriptores: generados desde proto/ en ./gen (no editar; `pnpm proto:gen`).
 * - Transporte: Connect sobre HTTP (JSON) hacia el BFF `/api/engine`.
 * - Mocks: `@lumen/sdk/mocks` (transporte en memoria). La UI nunca define datos de ejemplo.
 */
export * from "./gen/lumen/v1/common_pb";
export * from "./gen/lumen/v1/health_pb";
export * from "./gen/lumen/v1/sites_pb";
export * from "./gen/lumen/v1/terrain_pb";
export * from "./gen/lumen/v1/horizon_pb";
export * from "./gen/lumen/v1/ephemeris_pb";
export * from "./gen/lumen/v1/analysis_pb";
export * from "./gen/lumen/v1/jobs_pb";
export * from "./gen/lumen/v1/power_pb";
export * from "./gen/lumen/v1/whatif_pb";
export * from "./gen/lumen/v1/search_pb";
export * from "./gen/lumen/v1/export_pb";
export * from "./gen/lumen/v1/validation_pb";

export { createLumenClient, type LumenClient } from "./client";
export { createLumenTransport, type LumenTransportOptions } from "./transport";
export { engineErrorCode, isUnimplemented } from "./errors";
export { validateMessage } from "./validate";
