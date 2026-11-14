/**
 * Transporte del SDK para toda la app. Compartido (docs/team/ROLES.md).
 * NEXT_PUBLIC_ENGINE_MOCK=1 → mocks del SDK (@lumen/sdk/mocks). La UI no contiene datos de ejemplo.
 */
import { createLumenTransport } from "@lumen/sdk";

export const transport = createLumenTransport({
  baseUrl: "/api/engine",
  mock: process.env.NEXT_PUBLIC_ENGINE_MOCK === "1",
});
