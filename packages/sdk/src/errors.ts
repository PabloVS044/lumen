import { Code, ConnectError } from "@connectrpc/connect";

import { ErrorDetailSchema } from "./gen/lumen/v1/common_pb";

/** Código de dominio estable (NO_COVERAGE, SITE_NOT_FOUND, VALIDATION_ERROR...) de un error del motor. */
export function engineErrorCode(err: unknown): string | undefined {
  const ce = ConnectError.from(err);
  return ce.findDetails(ErrorDetailSchema)[0]?.code;
}

export function isUnimplemented(err: unknown): boolean {
  return ConnectError.from(err).code === Code.Unimplemented;
}
