import type { Transport } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

import { createMockTransport } from "./mocks/transport";

export interface LumenTransportOptions {
  /** URL base del BFF (por defecto `/api/engine`). */
  baseUrl?: string;
  /** true = transporte en memoria con datos sintéticos del SDK (sin motor). */
  mock?: boolean;
}

/** Transporte único para toda la app: real (Connect JSON vía BFF) o mock del SDK. */
export function createLumenTransport({
  baseUrl = "/api/engine",
  mock = false,
}: LumenTransportOptions = {}): Transport {
  if (mock) return createMockTransport();
  return createConnectTransport({ baseUrl, useBinaryFormat: false });
}
