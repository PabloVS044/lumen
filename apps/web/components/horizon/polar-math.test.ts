import { describe, expect, it } from "vitest";

import {
  angularRadiusFraction,
  dipDeg,
  nearestIndex,
  nearestXY,
  polarSummary,
  radialScale,
  splitSegments,
  toXY,
} from "./polar-math";

describe("radialScale (non-linear, section 12.2)", () => {
  const r = radialScale("full");

  it("puts the zenith at the centre, -5 deg at the rim and highlights 0 deg inside it", () => {
    expect(r(90)).toBe(0);
    expect(r(-5)).toBe(1);
    expect(r(0)).toBeCloseTo(0.8, 12);
  });

  it("gives the 0-15 deg band far more room than a linear scale would", () => {
    const linearShare = 15 / 95;
    expect(r(0) - r(15)).toBeGreaterThan(linearShare * 2);
  });

  it("is strictly decreasing in elevation and clamps outside [-5, 90]", () => {
    const els = [-5, -3, 0, 1.5, 5, 10, 15, 45, 90];
    for (let i = 1; i < els.length; i++) expect(r(els[i]!)).toBeLessThan(r(els[i - 1]!));
    expect(r(-20)).toBe(1);
    expect(r(120)).toBe(0);
  });

  it("zoom mode spreads -5..15 deg over the whole radius", () => {
    const z = radialScale("zoom");
    expect(z(-5)).toBe(1);
    expect(z(15)).toBe(0);
    expect(z(0)).toBeCloseTo(0.75, 12);
    expect(z(60)).toBe(0);
  });
});

describe("toXY", () => {
  it("measures azimuth from the north, clockwise, with north up", () => {
    const n = toXY(0, 1);
    const e = toXY(90, 1);
    const s = toXY(180, 1);
    expect(n.x).toBeCloseTo(0, 12);
    expect(n.y).toBeCloseTo(-1, 12);
    expect(e.x).toBeCloseTo(1, 12);
    expect(e.y).toBeCloseTo(0, 12);
    expect(s.y).toBeCloseTo(1, 12);
  });
});

describe("dipDeg", () => {
  it("is zero at ground level and grows with observer height, always below the horizontal", () => {
    expect(dipDeg(0)).toBeCloseTo(0, 12);
    // acos(R / (R + h)) ~ sqrt(2h / R): 2 m on a 1737.4 km radius is ~0.087 deg
    expect(dipDeg(2)).toBeCloseTo(-0.0869, 3);
    expect(dipDeg(10)).toBeLessThan(dipDeg(2));
  });
});

describe("splitSegments", () => {
  const p = (az: number, el: number, visible: boolean) => ({ az, el, visible });

  it("splits into visible and hidden runs that share their boundary point", () => {
    const segs = splitSegments([
      p(10, 1, true),
      p(11, 0.5, true),
      p(12, -1, false),
      p(13, 1, true),
    ]);
    expect(segs.map((s) => s.visible)).toEqual([true, false, true]);
    expect(segs[0]!.points.map((q) => q.az)).toEqual([10, 11]);
    expect(segs[1]!.points.map((q) => q.az)).toEqual([11, 12]);
    expect(segs[2]!.points.map((q) => q.az)).toEqual([12, 13]);
  });

  it("breaks the line where the azimuth wraps around 0/360", () => {
    const segs = splitSegments([p(350, 1, true), p(359, 1, true), p(1, 1, true), p(10, 1, true)]);
    expect(segs).toHaveLength(2);
    expect(segs[0]!.points.map((q) => q.az)).toEqual([350, 359]);
    expect(segs[1]!.points.map((q) => q.az)).toEqual([1, 10]);
  });

  it("returns nothing for an empty path", () => {
    expect(splitSegments([])).toEqual([]);
  });
});

describe("nearestIndex", () => {
  it("returns the index of the closest time", () => {
    expect(nearestIndex([0, 10, 20], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20], 16)).toBe(2);
    expect(nearestIndex([], 5)).toBe(-1);
  });
});

describe("angularRadiusFraction", () => {
  it("scales a real angular diameter through the radial scale", () => {
    const r = radialScale("full");
    const sun = angularRadiusFraction(r, 5, 0.53);
    const earth = angularRadiusFraction(r, 5, 1.9);
    expect(sun).toBeGreaterThan(0);
    expect(earth).toBeGreaterThan(sun * 3);
  });
});

describe("nearestXY", () => {
  it("returns the index of the closest point", () => {
    expect(
      nearestXY(
        [
          { x: 0, y: 0 },
          { x: 10, y: 10 },
        ],
        8,
        9,
      ),
    ).toBe(1);
    expect(nearestXY([], 0, 0)).toBe(-1);
  });
});

describe("polarSummary", () => {
  it("states the numbers and where each body is relative to the terrain horizon", () => {
    const text = polarSummary({
      terrainMax: { el: 3.46, az: 120 },
      sunVisiblePct: 81.2,
      earthVisiblePct: 40,
      longestDarkH: 96,
      longestBlackoutH: 300,
      now: {
        time: "2027-01-15 06:00",
        sun: { az: 10, el: -1, visible: false },
        earth: { az: 5, el: 2, visible: true },
      },
    });
    expect(text).toContain("peaks at 3.5° elevation toward azimuth 120.0°");
    expect(text).toContain("81.2% of the time");
    expect(text).toContain("longest dark spell lasts 96.0 h");
    expect(text).toContain("blackout lasts 300.0 h");
    expect(text).toMatch(
      /Sun is at azimuth 10\.0°, elevation -1\.0° \(below the terrain horizon\)/,
    );
    expect(text).toMatch(/Earth at azimuth 5\.0°, elevation 2\.0° \(above the terrain horizon\)/);
  });
});
