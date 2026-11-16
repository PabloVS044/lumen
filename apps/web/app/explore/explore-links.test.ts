import { describe, expect, it } from "vitest";

import { compareHref, nextFreeColor, rangeOf, siteHref } from "./explore-links";

const range = { start: "2027-01-01", end: "2027-03-01" };

describe("siteHref", () => {
  it("builds /site with the URL state of section 12.3", () => {
    const href = siteHref({ lat: -89.45, lon: -137.31 }, range, "2027-01-15T06:00:00.000Z");
    const url = new URL(href, "http://x");
    expect(url.pathname).toBe("/site");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      lat: "-89.45",
      lon: "-137.31",
      h: "2",
      start: "2027-01-01",
      end: "2027-03-01",
      t: "2027-01-15T06:00:00.000Z",
      tab: "horizon",
    });
  });
});

describe("compareHref", () => {
  it("repeats s=lat,lon,start,end once per active site", () => {
    const href = compareHref(
      [
        { lat: -89.45, lon: -137.31 },
        { lat: -85.9, lon: 0.3 },
      ],
      range,
    );
    expect(href).toBe(
      "/compare?s=-89.45,-137.31,2027-01-01,2027-03-01&s=-85.9,0.3,2027-01-01,2027-03-01",
    );
  });

  it("is plain /compare with no sites", () => {
    expect(compareHref([], range)).toBe("/compare");
  });
});

describe("nextFreeColor", () => {
  it("returns the first site token that is not in use, then undefined when all four are", () => {
    expect(nextFreeColor([])).toBe("var(--color-site-1)");
    expect(
      nextFreeColor([{ color: "var(--color-site-1)" }, { color: "var(--color-site-3)" }]),
    ).toBe("var(--color-site-2)");
    const all = [1, 2, 3, 4].map((n) => ({ color: `var(--color-site-${n})` }));
    expect(nextFreeColor(all)).toBeUndefined();
  });
});

describe("rangeOf", () => {
  it("uses the window as YYYY-MM-DD dates", () => {
    expect(
      rangeOf({
        startMs: Date.parse("2027-01-15T06:00:00Z"),
        endMs: Date.parse("2027-02-14T06:00:00Z"),
      }),
    ).toEqual({
      start: "2027-01-15",
      end: "2027-02-14",
    });
  });
});
