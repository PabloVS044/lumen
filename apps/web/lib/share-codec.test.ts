import { PanelOrientation } from "@lumen/sdk";
import { describe, expect, it } from "vitest";

import { decodePower, decodeWhatIf, encodePower, encodeWhatIf } from "./share-codec";

const power = {
  panelAreaM2: 2,
  efficiency: 0.28,
  orientation: PanelOrientation.VERTICAL_FIXED,
  panelAzimuthDeg: 135,
  batteryWh: 2000,
  soc0Pct: 100,
  maxDodPct: 80,
  loadDayW: 150,
  loadNightW: 0,
  batteryEfficiency: 0.95,
};

const whatIf = {
  nominal: "2027-01-01",
  maxDelayDays: 30,
  stepHours: 24,
  missionDays: 14,
  metrics: ["illumination_pct", "longest_dark_h"] as const,
  withPower: true,
};

describe("power codec", () => {
  it("round-trips every field, including explicit zeros", () => {
    const s = encodePower(power);
    expect(s).toBe("2,0.28,vf,135,2000,100,80,150,0,0.95");
    expect(decodePower(s)).toEqual(power);
  });

  it.each([
    "",
    "1,2,3",
    "2,0.28,xx,0,2000,100,80,150,60,0.95",
    "a,0.28,vt,0,2000,100,80,150,60,0.95",
  ])("ignores malformed values: %s", (s) => {
    expect(decodePower(s)).toBeNull();
  });
});

describe("what-if codec", () => {
  it("round-trips the form", () => {
    const s = encodeWhatIf({ ...whatIf, metrics: [...whatIf.metrics] });
    expect(s).toBe("2027-01-01,30,24,14,illumination_pct.longest_dark_h,1");
    expect(decodeWhatIf(s)).toEqual({ ...whatIf, metrics: [...whatIf.metrics] });
  });

  it("drops unknown metrics and rejects malformed values", () => {
    expect(decodeWhatIf("2027-01-01,30,24,14,illumination_pct.nope,0")?.metrics).toEqual([
      "illumination_pct",
    ]);
    expect(decodeWhatIf("2027-01-01,30,24,14,nope,0")).toBeNull();
    expect(decodeWhatIf("2027-01-01,x,24,14,illumination_pct,0")).toBeNull();
    expect(decodeWhatIf("2027-01-01,30,24")).toBeNull();
  });
});
