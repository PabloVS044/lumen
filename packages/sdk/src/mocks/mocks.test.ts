import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";

import { createLumenClient } from "../client";
import { AnalyzeRequestSchema } from "../gen/lumen/v1/analysis_pb";
import { engineErrorCode, isUnimplemented } from "../errors";
import { createMockTransport } from "./transport";

const client = createLumenClient(createMockTransport());

const request = create(AnalyzeRequestSchema, {
  site: { lat: -89.45, lon: -137.31 },
  range: {
    start: timestampFromDate(new Date("2027-01-01T00:00:00Z")),
    end: timestampFromDate(new Date("2027-03-01T00:00:00Z")),
    stepMinutes: 60,
  },
});

describe("mock transport", () => {
  it("analyze returns a coherent synthetic result", async () => {
    const res = await client.analysis.analyze(request);
    expect(res.outcome.case).toBe("result");
    if (res.outcome.case !== "result") return;
    const { series, metrics, meta } = res.outcome.value;
    expect(meta?.engineVersion).toBe("mock");
    expect(series?.time.length).toBe(series?.sunVisible.length);
    expect(metrics?.illuminationPct).toBeGreaterThanOrEqual(0);
    expect(metrics?.illuminationPct).toBeLessThanOrEqual(100);
  });

  it("propagates domain error codes", async () => {
    await expect(client.sites.getSite({ id: "nope" })).rejects.toSatisfy(
      (e) => engineErrorCode(e) === "SITE_NOT_FOUND",
    );
  });

  it("unmocked services behave like the real engine (Unimplemented)", async () => {
    await expect(client.jobs.getJob({ jobId: "x" })).rejects.toSatisfy(isUnimplemented);
  });
});
