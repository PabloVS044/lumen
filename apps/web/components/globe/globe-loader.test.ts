import { describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => loader,
}));
vi.mock("./globe", () => ({ Globe: () => null }));

import { GlobeLoader } from "./globe-loader";

describe("GlobeLoader", () => {
  it("sets CESIUM_BASE_URL before loading the globe module", async () => {
    const w = window as unknown as { CESIUM_BASE_URL?: string };
    delete w.CESIUM_BASE_URL;
    await (GlobeLoader as unknown as () => Promise<unknown>)();
    expect(w.CESIUM_BASE_URL).toBe("/cesium");
  });
});
