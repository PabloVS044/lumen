import { describe, expect, it } from "vitest";

import { hourSplit, slerp, subpoint, terminatorRing, type Vec3 } from "./lighting";

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a: Vec3) => Math.hypot(a.x, a.y, a.z);

describe("slerp", () => {
  const a = { x: 1, y: 0, z: 0 };
  const b = { x: 0, y: 1, z: 0 };

  it("returns the endpoints at t=0 and t=1", () => {
    expect(slerp(a, b, 0)).toEqual(a);
    expect(slerp(a, b, 1)).toEqual(b);
  });

  it("keeps unit length and splits the angle evenly at t=0.5", () => {
    const m = slerp(a, b, 0.5);
    expect(norm(m)).toBeCloseTo(1, 12);
    expect(dot(m, a)).toBeCloseTo(Math.SQRT1_2, 12);
    expect(dot(m, b)).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it("falls back to the first vector when both are the same direction", () => {
    expect(slerp(a, a, 0.3)).toEqual(a);
  });
});

describe("terminatorRing", () => {
  it("puts every point 90 degrees from the Sun, at the requested radius", () => {
    const sun = { x: 0.3, y: -0.5, z: 0.1 };
    const ring = terminatorRing(sun, 1_742_400, 120);
    expect(ring).toHaveLength(121);
    const sunLen = norm(sun);
    for (const p of ring) {
      expect(norm(p)).toBeCloseTo(1_742_400, 3);
      expect(dot(p, sun) / (norm(p) * sunLen)).toBeCloseTo(0, 12);
    }
  });

  it("closes the ring", () => {
    const ring = terminatorRing({ x: 0, y: 0, z: 1 }, 1, 36);
    expect(ring[0]!.x).toBeCloseTo(ring[36]!.x, 12);
    expect(ring[0]!.y).toBeCloseTo(ring[36]!.y, 12);
  });
});

describe("subpoint", () => {
  it("maps MOON_ME directions to lat/lon in degrees, lon in [-180, 180)", () => {
    expect(subpoint({ x: 1, y: 0, z: 0 })).toEqual({ latDeg: 0, lonDeg: 0 });
    expect(subpoint({ x: 0, y: 1, z: 0 })).toEqual({ latDeg: 0, lonDeg: 90 });
    expect(subpoint({ x: 0, y: 0, z: -1 }).latDeg).toBeCloseTo(-90, 12);
    expect(subpoint({ x: -1, y: 0, z: 0 }).lonDeg).toBe(-180);
  });
});

describe("hourSplit", () => {
  it("returns the hour boundary and the fraction elapsed within it", () => {
    const { start, frac } = hourSplit(new Date("2027-01-15T06:15:00Z"));
    expect(start.toISOString()).toBe("2027-01-15T06:00:00.000Z");
    expect(frac).toBeCloseTo(0.25, 12);
  });
});
