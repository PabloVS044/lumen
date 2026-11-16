import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { describe, expect, it } from "vitest";

import { createLumenClient } from "../client";
import { AnalyzeRequestSchema } from "../gen/lumen/v1/analysis_pb";
import { engineErrorCode, isUnimplemented } from "../errors";
import { EventType } from "../gen/lumen/v1/ephemeris_pb";
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

  describe("listEvents", () => {
    const from = new Date("2027-01-15T00:00:00Z");
    const listEvents = (over: { types?: EventType[]; horizonDays?: number } = {}) =>
      client.ephemeris.listEvents({
        site: { lat: -89.45, lon: -137.31 },
        from: timestampFromDate(from),
        ...over,
      });

    it("is deterministic: same input, same events", async () => {
      expect(await listEvents()).toEqual(await listEvents());
    });

    it("returns ascending events inside the default 60 day window", async () => {
      const { events } = await listEvents();
      expect(events.length).toBeGreaterThan(0);
      const ms = events.map((e) => Number(e.time!.seconds) * 1000);
      expect([...ms].sort((a, b) => a - b)).toEqual(ms);
      expect(ms[0]).toBeGreaterThanOrEqual(from.getTime());
      expect(ms.at(-1)).toBeLessThanOrEqual(from.getTime() + 60 * 86_400_000);
    });

    it("honours horizonDays and the types filter", async () => {
      const short = await listEvents({ horizonDays: 5 });
      const all = await listEvents();
      expect(short.events.length).toBeLessThan(all.events.length);
      const sunsets = await listEvents({ types: [EventType.SUNSET] });
      expect(sunsets.events.length).toBeGreaterThan(0);
      expect(sunsets.events.every((e) => e.type === EventType.SUNSET)).toBe(true);
    });
  });

  describe("getSeries", () => {
    const range = {
      start: timestampFromDate(new Date("2027-01-15T00:00:00Z")),
      end: timestampFromDate(new Date("2027-01-15T03:00:00Z")),
      stepMinutes: 30,
    };
    const site = { lat: -89.45, lon: -137.31 };

    it("returns aligned time, azimuth and elevation arrays for Sun and Earth", async () => {
      const res = await client.ephemeris.getSeries({ site, range });
      expect(res.time.length).toBeGreaterThan(1);
      expect(res.sun?.azDeg.length).toBe(res.time.length);
      expect(res.sun?.elDeg.length).toBe(res.time.length);
      expect(res.earth?.azDeg.length).toBe(res.time.length);
    });

    it("is deterministic", async () => {
      expect(await client.ephemeris.getSeries({ site, range })).toEqual(
        await client.ephemeris.getSeries({ site, range }),
      );
    });
  });
});

describe("power simulation mock", () => {
  const scenario = {
    site: { lat: -89.45, lon: -137.31 },
    range: {
      start: timestampFromDate(new Date("2027-01-01T00:00:00Z")),
      end: timestampFromDate(new Date("2027-02-01T00:00:00Z")),
      stepMinutes: 60,
    },
  };

  it("returns aligned series within the battery bounds", async () => {
    const res = await client.power.simulate({ scenario });
    const n = res.time.length;
    expect(n).toBeGreaterThan(24 * 30);
    expect(res.pGenW).toHaveLength(n);
    expect(res.pLoadW).toHaveLength(n);
    expect(res.socPct).toHaveLength(n);
    expect(Math.min(...res.socPct)).toBeGreaterThanOrEqual(20 - 1e-9);
    expect(Math.max(...res.socPct)).toBeLessThanOrEqual(100 + 1e-9);
    expect(res.minSocPct).toBeCloseTo(Math.min(...res.socPct));
  });

  it("a tiny battery browns out and reports when", async () => {
    const res = await client.power.simulate({ scenario, config: { batteryWh: 50 } });
    expect(res.survives).toBe(false);
    expect(res.firstBrownoutTime).toBeDefined();
    expect(res.energyMarginWh).toBeLessThan(0);
  });
});
