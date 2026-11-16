import { describe, expect, it } from "vitest";

import { EXPENSIVE_METHODS, clientIp, createRateLimiter, parseRateLimitPerMin } from "./rate-limit";

const WINDOW = 60_000;

function clock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("lets requests through while under the limit", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 3, windowMs: WINDOW, now: c.now });
    for (let i = 0; i < 3; i++) {
      expect(limiter.hit("1.2.3.4")).toEqual({ allowed: true, retryAfterSec: 0 });
    }
  });

  it("blocks the 31st request with a Retry-After until the oldest hit expires", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 30, windowMs: WINDOW, now: c.now });
    for (let i = 0; i < 30; i++) limiter.hit("ip");
    c.advance(10_000);
    expect(limiter.hit("ip")).toEqual({ allowed: false, retryAfterSec: 50 });
  });

  it("resets once the window has passed", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 2, windowMs: WINDOW, now: c.now });
    limiter.hit("ip");
    limiter.hit("ip");
    expect(limiter.hit("ip").allowed).toBe(false);
    c.advance(WINDOW);
    expect(limiter.hit("ip").allowed).toBe(true);
    expect(limiter.hit("ip").allowed).toBe(true);
    expect(limiter.hit("ip").allowed).toBe(false);
  });

  it("keeps different IPs independent", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: WINDOW, now: c.now });
    expect(limiter.hit("a").allowed).toBe(true);
    expect(limiter.hit("a").allowed).toBe(false);
    expect(limiter.hit("b").allowed).toBe(true);
  });

  it("evicts keys whose hits are all outside the window", () => {
    const c = clock();
    const limiter = createRateLimiter({ limit: 5, windowMs: WINDOW, now: c.now });
    for (let i = 0; i < 100; i++) limiter.hit(`ip-${i}`);
    expect(limiter.size()).toBe(100);
    c.advance(WINDOW);
    limiter.hit("fresh");
    expect(limiter.size()).toBe(1);
  });
});

describe("EXPENSIVE_METHODS", () => {
  it("lists exactly the four costly RPCs", () => {
    expect([...EXPENSIVE_METHODS].sort()).toEqual([
      "lumen.v1.AnalysisService/Analyze",
      "lumen.v1.AnalysisService/Compare",
      "lumen.v1.ExportService/CreateExport",
      "lumen.v1.SearchService/FindBestSpot",
    ]);
  });

  it("does not include cheap methods", () => {
    expect(EXPENSIVE_METHODS.has("lumen.v1.HorizonService/ComputeHorizon")).toBe(false);
    expect(EXPENSIVE_METHODS.has("lumen.v1.EphemerisService/GetSeries")).toBe(false);
    expect(EXPENSIVE_METHODS.has("lumen.v1.SiteService/ListSites")).toBe(false);
  });
});

describe("parseRateLimitPerMin", () => {
  it("defaults to 30 when unset or invalid", () => {
    expect(parseRateLimitPerMin(undefined)).toBe(30);
    expect(parseRateLimitPerMin("")).toBe(30);
    expect(parseRateLimitPerMin("abc")).toBe(30);
    expect(parseRateLimitPerMin("0")).toBe(30);
    expect(parseRateLimitPerMin("-5")).toBe(30);
  });

  it("reads a positive integer", () => {
    expect(parseRateLimitPerMin("120")).toBe(120);
    expect(parseRateLimitPerMin(" 7 ")).toBe(7);
  });
});

describe("clientIp", () => {
  it("uses the first hop of X-Forwarded-For", () => {
    expect(clientIp("203.0.113.9, 10.0.0.1")).toBe("203.0.113.9");
  });

  it("falls back to 'unknown'", () => {
    expect(clientIp(null)).toBe("unknown");
    expect(clientIp("")).toBe("unknown");
  });
});
