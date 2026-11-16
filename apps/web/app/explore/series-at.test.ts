import { describe, expect, it } from "vitest";

import { sampleAt } from "./series-at";

const sec = (iso: string) => ({ seconds: BigInt(Date.parse(iso) / 1000), nanos: 0 });
const series = {
  time: [sec("2027-01-15T06:00:00Z"), sec("2027-01-15T06:30:00Z"), sec("2027-01-15T07:00:00Z")],
  sun: { azDeg: [10, 20, 30], elDeg: [-1, 0, 1] },
  earth: { azDeg: [350, 351, 352], elDeg: [2, 3, 4] },
};

describe("sampleAt", () => {
  it("picks the sample closest in time", () => {
    expect(sampleAt(series, Date.parse("2027-01-15T06:20:00Z"))).toEqual({
      sun: { az: 20, el: 0 },
      earth: { az: 351, el: 3 },
    });
    expect(sampleAt(series, Date.parse("2027-01-15T06:05:00Z"))?.sun).toEqual({ az: 10, el: -1 });
  });

  it("returns undefined for an empty series", () => {
    expect(sampleAt({ time: [] }, 0)).toBeUndefined();
  });
});
