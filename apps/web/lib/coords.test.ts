import { describe, expect, it } from "vitest";

import { formatLatLon, normalizeLon, parseAngle, parseLatitude, parseLongitude } from "./coords";

describe("normalizeLon", () => {
  it("maps 0–360 to [-180, 180)", () => {
    expect(normalizeLon(222.69)).toBeCloseTo(-137.31);
    expect(normalizeLon(180)).toBe(-180);
    expect(normalizeLon(-10)).toBe(-10);
  });
});

describe("parseAngle", () => {
  it("parses decimal and DMS", () => {
    expect(parseAngle("-89.45")).toBe(-89.45);
    expect(parseAngle("89°27'S")).toBeCloseTo(-89.45);
    expect(parseAngle("222°41'E")).toBeCloseTo(222.6833, 3);
  });
  it("rejects garbage", () => {
    expect(parseAngle("north")).toBeNull();
  });
});

describe("parseLatitude (HU-01 AC1, AC2)", () => {
  it("accepts decimal and DMS south", () => {
    expect(parseLatitude("-89.45")).toEqual({ ok: true, value: -89.45 });
    const dms = parseLatitude("89°27'S");
    expect(dms.ok && dms.value).toBeCloseTo(-89.45);
  });

  it("rejects values outside [-90, 90]", () => {
    expect(parseLatitude("-90.5")).toEqual({
      ok: false,
      error: "Latitude must be between -90 and 90.",
    });
  });

  it("rejects an east/west hemisphere", () => {
    expect(parseLatitude("89°E")).toEqual({
      ok: false,
      error: "Latitude takes N or S, not E or W.",
    });
  });

  it("explains the accepted formats on unreadable input", () => {
    expect(parseLatitude("south")).toEqual({
      ok: false,
      error: "Write a decimal (-89.45) or degrees and minutes (89°27'S).",
    });
    expect(parseLatitude("  ")).toEqual({ ok: false, error: "Enter a latitude." });
  });
});

describe("parseLongitude (HU-01 AC1, AC2)", () => {
  it("normalizes 0–360 to [-180, 180)", () => {
    const east = parseLongitude("222°41'E");
    expect(east.ok && east.value).toBeCloseTo(-137.3167, 3);
    expect(parseLongitude("180")).toEqual({ ok: true, value: -180 });
    expect(parseLongitude("-137.31")).toEqual({ ok: true, value: -137.31 });
  });

  it("rejects values outside [-180, 360)", () => {
    expect(parseLongitude("360")).toEqual({
      ok: false,
      error: "Longitude must be between -180 and 360.",
    });
    expect(parseLongitude("-181")).toEqual({
      ok: false,
      error: "Longitude must be between -180 and 360.",
    });
  });

  it("rejects a north/south hemisphere", () => {
    expect(parseLongitude("10°N")).toEqual({
      ok: false,
      error: "Longitude takes E or W, not N or S.",
    });
  });
});

describe("formatLatLon", () => {
  it("writes hemispheres with the API longitude range", () => {
    expect(formatLatLon(-89.45, -137.31)).toBe("89.450° S, 137.310° W");
    expect(formatLatLon(0.67, 23.47)).toBe("0.670° N, 23.470° E");
    expect(formatLatLon(-10, 200)).toBe("10.000° S, 160.000° W");
  });
});
