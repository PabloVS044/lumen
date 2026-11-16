import { describe, expect, it } from "vitest";

import { EARTH_MAX_SUBSOLAR_LAT_DEG, MOON_MAX_SUBSOLAR_LAT_DEG, noonSunRange } from "./sun-height";

describe("noonSunRange", () => {
  it("reaches the zenith in the tropics and stays high all year", () => {
    const r = noonSunRange(15, EARTH_MAX_SUBSOLAR_LAT_DEG);
    expect(r.highest).toBe(90);
    expect(r.lowest).toBeCloseTo(51.56, 2);
  });

  it("is symmetric between north and south", () => {
    expect(noonSunRange(-40, EARTH_MAX_SUBSOLAR_LAT_DEG)).toEqual(
      noonSunRange(40, EARTH_MAX_SUBSOLAR_LAT_DEG),
    );
  });

  it("barely clears the horizon near the lunar south pole", () => {
    const r = noonSunRange(-89.44, MOON_MAX_SUBSOLAR_LAT_DEG);
    expect(r.highest).toBeCloseTo(2.15, 2);
    expect(r.lowest).toBeCloseTo(-1.03, 2);
  });

  it("drops below the horizon at noon at Earth's poles in winter", () => {
    const r = noonSunRange(90, EARTH_MAX_SUBSOLAR_LAT_DEG);
    expect(r.highest).toBeCloseTo(23.44, 2);
    expect(r.lowest).toBeLessThan(0);
  });
});
