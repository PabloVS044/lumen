import { describe, expect, it } from "vitest";

import { buildUpstreamHeaders } from "./upstream-headers";

const incoming = new Headers({
  "content-type": "application/json",
  "connect-protocol-version": "1",
  cookie: "session=abc",
  authorization: "Bearer x",
  "x-lumen-secret": "spoofed-by-browser",
});

describe("buildUpstreamHeaders", () => {
  it("adds x-lumen-secret when the secret is set", () => {
    const h = buildUpstreamHeaders(incoming, "real-secret");
    expect(h.get("x-lumen-secret")).toBe("real-secret");
  });

  it("omits x-lumen-secret when unset or empty, and never forwards the client's", () => {
    expect(buildUpstreamHeaders(incoming, undefined).has("x-lumen-secret")).toBe(false);
    expect(buildUpstreamHeaders(incoming, "").has("x-lumen-secret")).toBe(false);
  });

  it("forwards only allowed headers", () => {
    const h = buildUpstreamHeaders(incoming, "s");
    expect(h.get("content-type")).toBe("application/json");
    expect(h.get("connect-protocol-version")).toBe("1");
    expect(h.has("cookie")).toBe(false);
    expect(h.has("authorization")).toBe(false);
  });
});
