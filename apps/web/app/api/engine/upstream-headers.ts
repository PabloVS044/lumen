/**
 * Cabeceras hacia el motor: solo las permitidas del cliente + el secreto compartido (R1).
 * El secreto nunca viene del navegador ni se devuelve a él.
 */
export const FORWARD_HEADERS = [
  "content-type",
  "connect-protocol-version",
  "connect-timeout-ms",
  "accept-encoding",
];

export const SECRET_HEADER = "x-lumen-secret";

export function buildUpstreamHeaders(incoming: Headers, secret: string | undefined): Headers {
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = incoming.get(name);
    if (value) headers.set(name, value);
  }
  if (secret) headers.set(SECRET_HEADER, secret);
  return headers;
}
