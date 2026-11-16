import { describe, expect, it } from "vitest";

import {
  discRadiusPx,
  horizonAt,
  horizonProfile,
  panoramaSummary,
  project,
  viewHorizonRange,
  wrapDeg,
  type HorizonMaskLike,
} from "./panorama-math";

const view = { heading: 90, fovDeg: 60, width: 600, height: 300 };

describe("wrapDeg", () => {
  it("wraps an angle difference into [-180, 180)", () => {
    expect(wrapDeg(190)).toBe(-170);
    expect(wrapDeg(-190)).toBe(170);
    expect(wrapDeg(180)).toBe(-180);
    expect(wrapDeg(30)).toBe(30);
    expect(wrapDeg(720)).toBe(0);
  });
});

describe("project (rectilinear, camera level, same projection as Cesium)", () => {
  it("puts the view direction at the centre of the picture", () => {
    const p = project({ az: 90, el: 0 }, view);
    expect(p.x).toBeCloseTo(300, 9);
    expect(p.y).toBeCloseTo(150, 9);
    expect(p.inFront).toBe(true);
  });

  it("puts the edge of the field of view at the edge of the picture", () => {
    expect(project({ az: 120, el: 0 }, view).x).toBeCloseTo(600, 9);
    expect(project({ az: 60, el: 0 }, view).x).toBeCloseTo(0, 9);
  });

  it("measures azimuth clockwise from the north: east of the heading is to the right", () => {
    expect(project({ az: 100, el: 0 }, view).x).toBeGreaterThan(300);
    expect(project({ az: 80, el: 0 }, view).x).toBeLessThan(300);
  });

  it("raises higher elevations in the picture (y grows downward)", () => {
    expect(project({ az: 90, el: 10 }, view).y).toBeLessThan(project({ az: 90, el: 0 }, view).y);
    expect(project({ az: 90, el: -10 }, view).y).toBeGreaterThan(150);
  });

  it("handles azimuths on the other side of the 0/360 wrap", () => {
    const north = { ...view, heading: 0 };
    expect(project({ az: 359, el: 0 }, north).x).toBeLessThan(300);
    expect(project({ az: 1, el: 0 }, north).x).toBeGreaterThan(300);
  });

  it("marks directions behind the camera as not in front", () => {
    expect(project({ az: 270, el: 0 }, view).inFront).toBe(false);
  });
});

describe("horizonAt", () => {
  const mask: HorizonMaskLike = { azStepDeg: 90, elevationDeg: [0, 4, 8, 12] };

  it("interpolates the engine mask linearly between samples and wraps at 360", () => {
    expect(horizonAt(mask, 0)).toBe(0);
    expect(horizonAt(mask, 45)).toBeCloseTo(2, 12);
    expect(horizonAt(mask, 90)).toBe(4);
    expect(horizonAt(mask, 315)).toBeCloseTo(6, 12); // entre 12 (270) y 0 (360)
    expect(horizonAt(mask, 405)).toBeCloseTo(2, 12);
  });

  it("is undefined for an empty mask", () => {
    expect(horizonAt({ azStepDeg: 1, elevationDeg: [] }, 10)).toBeUndefined();
  });
});

describe("horizonProfile", () => {
  const flat: HorizonMaskLike = {
    azStepDeg: 1,
    elevationDeg: Array.from({ length: 360 }, () => 2),
  };

  it("returns one point per column across the field of view, left to right", () => {
    const pts = horizonProfile(flat, view, 12);
    expect(pts).toHaveLength(13);
    expect(pts[0]!.x).toBeCloseTo(0, 6);
    expect(pts.at(-1)!.x).toBeCloseTo(600, 6);
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.x).toBeGreaterThan(pts[i - 1]!.x);
  });

  it("draws a raised horizon above the centre line of the picture", () => {
    for (const p of horizonProfile(flat, view, 12)) expect(p.y).toBeLessThan(150);
  });
});

describe("viewHorizonRange", () => {
  it("gives the lowest and highest horizon elevation inside the field of view", () => {
    const mask: HorizonMaskLike = {
      azStepDeg: 10,
      elevationDeg: Array.from({ length: 36 }, (_, i) => (i === 9 ? 5 : 1)),
    };
    const r = viewHorizonRange(mask, { ...view, heading: 90 });
    expect(r).toEqual({ min: 1, max: 5 });
  });
});

describe("discRadiusPx", () => {
  it("scales an angular diameter to pixels with the same focal length as the picture", () => {
    const sun = discRadiusPx(0.53, view);
    const earth = discRadiusPx(1.9, view);
    expect(sun).toBeGreaterThan(0);
    expect(earth / sun).toBeCloseTo(1.9 / 0.53, 1);
    // f = 300 / tan(30deg) = 519.6; radio = f * tan(0.265deg) = 2.4 px
    expect(sun).toBeCloseTo(2.4, 1);
  });
});

describe("panoramaSummary", () => {
  it("states the direction, the horizon in view and where the Sun and Earth are", () => {
    const text = panoramaSummary({
      heading: 90,
      horizon: { min: 0.5, max: 3.25 },
      now: {
        time: "2027-01-15 06:00",
        sun: { az: 85, el: -1, visible: false },
        earth: { az: 5, el: 2, visible: true },
      },
    });
    expect(text).toContain("Looking toward azimuth 90.0°");
    expect(text).toContain("rises from 0.5° to 3.3° elevation");
    expect(text).toContain(
      "the Sun is at azimuth 85.0°, elevation -1.0° (below the terrain horizon)",
    );
    expect(text).toContain(
      "the Earth is at azimuth 5.0°, elevation 2.0° (above the terrain horizon)",
    );
    expect(text).toContain("The site is in shadow.");
  });

  it("does not claim shadow when the Sun is above the terrain horizon", () => {
    const text = panoramaSummary({
      heading: 0,
      now: {
        time: "t",
        sun: { az: 0, el: 3, visible: true },
        earth: { az: 0, el: 1, visible: true },
      },
    });
    expect(text).not.toContain("in shadow");
  });
});
