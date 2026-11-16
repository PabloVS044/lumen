import { describe, expect, it } from "vitest";

import { parseScenario, serializeScenario, shiftScenario } from "./compare-url";

describe("parseScenario (section 12.3)", () => {
  it("reads lat,lon,start,end", () => {
    expect(parseScenario("-89.45,-137.31,2027-01-01,2027-03-01")).toEqual({
      lat: -89.45,
      lon: -137.31,
      start: "2027-01-01",
      end: "2027-03-01",
    });
  });

  it("keeps a 0–360 longitude as written and rejects bad values", () => {
    expect(parseScenario("-89.45,222.69,2027-01-01,2027-03-01")?.lon).toBe(222.69);
    expect(parseScenario("-95,0,2027-01-01,2027-03-01")).toBeNull();
    expect(parseScenario("-89,400,2027-01-01,2027-03-01")).toBeNull();
    expect(parseScenario("-89,0,2027-03-01,2027-01-01")).toBeNull();
    expect(parseScenario("-89,0,2027-13-01,2027-14-01")).toBeNull();
    expect(parseScenario("-89,0")).toBeNull();
  });

  it("round-trips", () => {
    const s = "-85.5,10,2027-01-01,2027-01-31";
    expect(serializeScenario(parseScenario(s)!)).toBe(s);
  });
});

describe("shiftScenario (M6, delayed mission)", () => {
  it("moves both dates by whole days", () => {
    expect(shiftScenario({ lat: -85, lon: 0, start: "2027-01-20", end: "2027-02-19" }, 14)).toEqual(
      { lat: -85, lon: 0, start: "2027-02-03", end: "2027-03-05" },
    );
  });
});
