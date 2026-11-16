import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { AnalyzeRequestSchema } from "@lumen/sdk";
import { mockAnalysis } from "@lumen/sdk/mocks";
import { describe, expect, it } from "vitest";

import { ANALYSIS_CSV_HEADERS, analysisCsvRows, analysisJson, metricsCsvRows } from "./analysis";

const result = mockAnalysis(
  create(AnalyzeRequestSchema, {
    site: { lat: -89.45, lon: -137.31 },
    range: {
      start: timestampFromDate(new Date("2027-01-01T00:00:00Z")),
      end: timestampFromDate(new Date("2027-01-02T00:00:00Z")),
      stepMinutes: 60,
    },
    options: { includeSeries: true, includeMask: true },
  }),
);

describe("analysis export", () => {
  it("has one CSV row per instant with every series column", () => {
    const rows = analysisCsvRows(result);
    expect(rows).toHaveLength(25);
    expect(rows[0]).toHaveLength(ANALYSIS_CSV_HEADERS.length);
    expect(rows[0]![0]).toBe("2027-01-01T00:00:00.000Z");
    expect(ANALYSIS_CSV_HEADERS).toEqual([
      "time_utc",
      "sun_az_deg",
      "sun_el_deg",
      "sun_fraction",
      "earth_az_deg",
      "earth_el_deg",
      "earth_fraction",
      "horizon_at_sun_deg",
      "horizon_at_earth_deg",
      "eclipse_fraction",
      "sun_visible",
      "earth_visible",
      "operable",
    ]);
  });

  it("lists every metric with its value", () => {
    const rows = metricsCsvRows(result);
    const names = rows.map((r) => r[0]);
    expect(names).toContain("illuminationPct");
    expect(names).toContain("longestDarkH");
    expect(rows.every((r) => r.length === 2)).toBe(true);
  });

  it("writes the full result as canonical protobuf JSON", () => {
    const json = JSON.parse(analysisJson(result));
    expect(json.metrics.illuminationPct).toBeTypeOf("number");
    expect(json.series.time[0]).toBe("2027-01-01T00:00:00Z");
    expect(json.meta.engineVersion).toBe("mock");
  });
});
