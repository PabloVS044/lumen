import { describe, expect, it } from "vitest";

import { searchGridOffsetKm, searchGridPoint } from "./search-grid";

describe("search grid projection (reference values from pyproj)", () => {
  it("matches the polar stereographic DEM grid near the south pole", () => {
    // pyproj +proj=stere +lat_0=-90 +lat_ts=-90 +R=1737400: (-89.45,-137.31) -> (-11308.188, -12258.858) m
    // y (-89.4403,-137.134) -> (-11545.893, -12439.655) m
    const [x, y] = searchGridOffsetKm(
      { lat: -89.45, lon: -137.31 },
      { lat: -89.4403, lon: -137.134 },
    );
    expect(x).toBeCloseTo((-11545.893 + 11308.188) / 1000, 5);
    expect(y).toBeCloseTo((-12439.655 + 12258.858) / 1000, 5);
  });

  it("matches the centered azimuthal equidistant grid elsewhere", () => {
    // pyproj +proj=aeqd +lat_0=10 +lon_0=20: (10.05, 20.08) -> (2388.645, 1516.458) m
    const [x, y] = searchGridOffsetKm({ lat: 10, lon: 20 }, { lat: 10.05, lon: 20.08 });
    expect(x).toBeCloseTo(2.388645, 4);
    expect(y).toBeCloseTo(1.516458, 4);
  });

  it.each([
    [{ lat: -89.45, lon: -137.31 }, 1.2, -3.4],
    [{ lat: -85.9, lon: 30 }, -7.5, 2.25],
    [{ lat: 10, lon: 179.9 }, 3, 4],
  ])("round-trips offsets for %o", (center, x, y) => {
    const p = searchGridPoint(center, x, y);
    const [x2, y2] = searchGridOffsetKm(center, p);
    expect(x2).toBeCloseTo(x, 6);
    expect(y2).toBeCloseTo(y, 6);
  });
});
