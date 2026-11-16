import { EventType } from "@lumen/sdk";
import { describe, expect, it } from "vitest";

import { nextChange } from "./countdown-model";

const H = 3_600_000;
const events = [
  { type: EventType.SUNSET, ms: 10 * H },
  { type: EventType.EARTHSET, ms: 12 * H },
  { type: EventType.SUNRISE, ms: 30 * H },
];

describe("nextChange (section 9.6)", () => {
  it("counts down to the next set while the body is up", () => {
    expect(nextChange(events, "sun", true, 4 * H)).toEqual({ kind: "set", atMs: 10 * H });
    expect(nextChange(events, "earth", true, 4 * H)).toEqual({ kind: "set", atMs: 12 * H });
  });

  it("counts down to the next rise while the body is hidden", () => {
    expect(nextChange(events, "sun", false, 11 * H)).toEqual({ kind: "rise", atMs: 30 * H });
  });

  it("ignores events at or before the current time", () => {
    expect(nextChange(events, "sun", true, 10 * H)).toEqual({ kind: "set", atMs: null });
  });

  it("reports no event in the range", () => {
    expect(nextChange(events, "earth", false, 13 * H)).toEqual({ kind: "rise", atMs: null });
  });
});
