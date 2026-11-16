import { mockCatalog } from "@lumen/sdk/mocks";
import { describe, expect, it } from "vitest";

import { filterSites, nextSiteColor, SITE_COLORS } from "./site-picker-model";

describe("filterSites", () => {
  it("matches name or id, ignoring case and accents", () => {
    expect(filterSites(mockCatalog, { query: "MASSIF" }).map((s) => s.id)).toEqual(["mock-massif"]);
    expect(filterSites(mockCatalog, { query: "mock-crater" }).map((s) => s.id)).toEqual([
      "mock-crater",
    ]);
    expect(filterSites(mockCatalog, { query: "" })).toHaveLength(mockCatalog.length);
  });

  it("filters by program, country and status", () => {
    expect(filterSites(mockCatalog, { program: "Mock" })).toHaveLength(mockCatalog.length);
    expect(filterSites(mockCatalog, { program: "Artemis" })).toHaveLength(0);
    expect(filterSites(mockCatalog, { country: "Nowhere" })).toHaveLength(0);
  });
});

describe("nextSiteColor", () => {
  it("returns the first site color not in use", () => {
    expect(nextSiteColor([])).toBe(SITE_COLORS[0]);
    expect(nextSiteColor([{ color: SITE_COLORS[0] }, { color: SITE_COLORS[2] }])).toBe(
      SITE_COLORS[1],
    );
  });

  it("returns undefined when all four are taken", () => {
    expect(nextSiteColor(SITE_COLORS.map((color) => ({ color })))).toBeUndefined();
  });
});
