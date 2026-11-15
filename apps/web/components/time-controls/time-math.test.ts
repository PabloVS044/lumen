import { describe, expect, it } from "vitest";

import {
  DAY_MS,
  HOUR_MS,
  advance,
  clamp,
  fromUtcInput,
  keyAction,
  nextEvent,
  parseUtc,
  resolveWindow,
  toUtcInput,
} from "./time-math";

const NOW = Date.parse("2027-01-15T06:00:00Z");

describe("parseUtc", () => {
  it("reads dates and date-times as UTC, with or without Z", () => {
    expect(parseUtc("2027-01-15")).toBe(NOW - 6 * HOUR_MS);
    expect(parseUtc("2027-01-15T06:00:00Z")).toBe(NOW);
    expect(parseUtc("2027-01-15T06:00")).toBe(NOW);
  });

  it("returns null for empty or invalid input", () => {
    expect(parseUtc(null)).toBeNull();
    expect(parseUtc("")).toBeNull();
    expect(parseUtc("tomorrow")).toBeNull();
  });
});

describe("resolveWindow", () => {
  it("uses start/end from the URL when present", () => {
    expect(resolveWindow({ start: "2027-01-01", end: "2027-03-01", t: null }, NOW)).toEqual({
      startMs: Date.parse("2027-01-01T00:00:00Z"),
      endMs: Date.parse("2027-03-01T00:00:00Z"),
    });
  });

  it("starts at t, then at the current hour, with a 30 day default length", () => {
    const fromT = resolveWindow({ start: null, end: null, t: "2027-02-01T00:00:00Z" }, NOW);
    expect(fromT.startMs).toBe(Date.parse("2027-02-01T00:00:00Z"));
    expect(fromT.endMs - fromT.startMs).toBe(30 * DAY_MS);
    const fromNow = resolveWindow({ start: null, end: null, t: null }, NOW);
    expect(fromNow.startMs).toBe(NOW);
  });

  it("ignores an end that is not after the start", () => {
    const w = resolveWindow({ start: "2027-03-01", end: "2027-01-01", t: null }, NOW);
    expect(w.endMs - w.startMs).toBe(30 * DAY_MS);
  });
});

describe("clamp", () => {
  it("keeps a value inside the window", () => {
    expect(clamp(5, 1, 3)).toBe(3);
    expect(clamp(-5, 1, 3)).toBe(1);
    expect(clamp(2, 1, 3)).toBe(2);
  });
});

describe("advance", () => {
  it("moves speed hours per second and stops at the end", () => {
    expect(advance(NOW, 500, 6, NOW + 10 * HOUR_MS)).toBe(NOW + 3 * HOUR_MS);
    expect(advance(NOW, 2000, 6, NOW + 10 * HOUR_MS)).toBe(NOW + 10 * HOUR_MS);
  });
});

describe("nextEvent", () => {
  const ev = (type: number, iso: string) => ({
    type,
    time: { seconds: BigInt(Date.parse(iso) / 1000), nanos: 0 },
  });
  const events = [
    ev(2, "2027-01-15T05:00:00Z"),
    ev(1, "2027-01-15T08:00:00Z"),
    ev(3, "2027-01-16T00:00:00Z"),
  ];

  it("picks the first event strictly after the current time", () => {
    expect(nextEvent(events, NOW)?.type).toBe(1);
    expect(nextEvent(events, Date.parse("2027-01-15T08:00:00Z"))?.type).toBe(3);
  });

  it("returns undefined when none is left", () => {
    expect(nextEvent(events, Date.parse("2027-02-01T00:00:00Z"))).toBeUndefined();
    expect(nextEvent([], NOW)).toBeUndefined();
  });
});

describe("keyAction", () => {
  it("maps the documented shortcuts", () => {
    expect(keyAction("ArrowRight")).toEqual({ deltaMs: HOUR_MS });
    expect(keyAction("ArrowLeft")).toEqual({ deltaMs: -HOUR_MS });
    expect(keyAction("PageUp")).toEqual({ deltaMs: DAY_MS });
    expect(keyAction("PageDown")).toEqual({ deltaMs: -DAY_MS });
    expect(keyAction("Home")).toEqual({ to: "start" });
    expect(keyAction("End")).toEqual({ to: "end" });
    expect(keyAction(" ")).toEqual({ toggle: true });
    expect(keyAction("a")).toBeNull();
  });
});

describe("UTC date input", () => {
  it("round-trips minutes in UTC", () => {
    expect(toUtcInput(NOW)).toBe("2027-01-15T06:00");
    expect(fromUtcInput("2027-01-15T06:00")).toBe(NOW);
  });
});
