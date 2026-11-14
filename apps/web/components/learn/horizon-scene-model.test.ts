import { describe, expect, it } from "vitest";

import {
  EARTH_RADIUS_DEG,
  LUNAR_DAY_D,
  SCENE,
  SUN_RADIUS_DEG,
  azToX,
  earthAt,
  elToY,
  sunAt,
  terrainElevation,
  visibleFraction,
} from "./horizon-scene-model";

describe("azToX", () => {
  it("centres north and runs S → W → N → E → S", () => {
    expect(azToX(180)).toBe(0);
    expect(azToX(270)).toBe(SCENE.width / 4);
    expect(azToX(0)).toBe(SCENE.width / 2);
    expect(azToX(360)).toBe(SCENE.width / 2);
    expect(azToX(90)).toBe((SCENE.width * 3) / 4);
    expect(azToX(-90)).toBe(SCENE.width / 4);
  });
});

describe("elToY", () => {
  it("puts 0° on the horizon line and higher elevations above it", () => {
    expect(elToY(0)).toBe(SCENE.horizonY);
    expect(elToY(2)).toBeLessThan(elToY(1));
  });
});

describe("terrainElevation", () => {
  it("is continuous across north", () => {
    expect(terrainElevation(0)).toBeCloseTo(terrainElevation(360), 9);
    expect(terrainElevation(-10)).toBeCloseTo(terrainElevation(350), 9);
  });
});

describe("sunAt", () => {
  it("moves westward (decreasing azimuth) and closes one circle per lunar day", () => {
    const a = sunAt(0).az;
    const b = sunAt(1).az;
    expect((a - b + 360) % 360).toBeCloseTo(360 / LUNAR_DAY_D, 6);
    expect(sunAt(LUNAR_DAY_D).az).toBeCloseTo(a, 6);
  });
});

describe("visibleFraction", () => {
  it("is 1 above the ridge, 0 below it and 1/2 when the ridge crosses the centre", () => {
    const az = 0;
    const h = terrainElevation(az);
    expect(visibleFraction({ az, el: h + 5 }, SUN_RADIUS_DEG)).toBe(1);
    expect(visibleFraction({ az, el: h - 5 }, SUN_RADIUS_DEG)).toBe(0);
    expect(visibleFraction({ az, el: h }, EARTH_RADIUS_DEG)).toBeCloseTo(0.5, 9);
  });
});

describe("illustration over one lunar day", () => {
  const samples = Array.from({ length: 2000 }, (_, i) => (i / 2000) * LUNAR_DAY_D);

  it("shows the Sun both lit and hidden behind terrain", () => {
    const lit = samples.filter((d) => visibleFraction(sunAt(d), SUN_RADIUS_DEG) >= 0.5).length;
    expect(lit).toBeGreaterThan(samples.length * 0.5);
    expect(lit).toBeLessThan(samples.length);
  });

  it("shows Earth both in view and below the horizon", () => {
    const seen = samples.filter((d) => visibleFraction(earthAt(d), EARTH_RADIUS_DEG) >= 0.5).length;
    expect(seen).toBeGreaterThan(samples.length * 0.25);
    expect(seen).toBeLessThan(samples.length * 0.9);
  });

  it("keeps Earth near the north horizon", () => {
    for (const d of samples) {
      const { az } = earthAt(d);
      expect(Math.min(az, 360 - az)).toBeLessThan(10);
    }
  });
});
