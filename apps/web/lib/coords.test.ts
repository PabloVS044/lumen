import { describe, expect, it } from "vitest";

import { normalizeLon, parseAngle } from "./coords";

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
