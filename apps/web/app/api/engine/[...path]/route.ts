/**
 * BFF: proxy Connect /api/engine/<lumen.v1.Service>/<Method> -> ENGINE_URL (sección 7.1, ADR-0012).
 * Owner: R1. Aquí va el rate limiting (sección 10.3) y se oculta la URL interna del motor.
 */
const ENGINE_URL = process.env.ENGINE_URL ?? "http://localhost:8000";
const FORWARD_HEADERS = [
  "content-type",
  "connect-protocol-version",
  "connect-timeout-ms",
  "accept-encoding",
];

async function proxy(req: Request, ctx: RouteContext<"/api/engine/[...path]">) {
  const { path } = await ctx.params;
  if (path.length !== 2 || !path[0]?.startsWith("lumen.v1.")) {
    return new Response(null, { status: 404 });
  }
  const url = new URL(req.url);
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const res = await fetch(`${ENGINE_URL}/${path.join("/")}${url.search}`, {
      method: req.method,
      headers,
      body: req.method === "GET" ? undefined : await req.arrayBuffer(),
    });
    return new Response(res.body, { status: res.status, headers: res.headers });
  } catch {
    return Response.json(
      { code: "unavailable", message: "Engine is not reachable." },
      { status: 503 },
    );
  }
}

export { proxy as GET, proxy as POST };
