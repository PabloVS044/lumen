import { act, render } from "@testing-library/react";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { useUrlTimeSync } from "./use-url-time";

function Probe() {
  useUrlTimeSync();
  return null;
}

beforeEach(() => useScenarioStore.setState({ currentTime: null }));

describe("useUrlTimeSync", () => {
  it("sets the current time from ?t= when the link is opened", () => {
    render(
      <NuqsTestingAdapter searchParams="?t=2027-01-15T06:00:00.000Z">
        <Probe />
      </NuqsTestingAdapter>,
    );
    expect(useScenarioStore.getState().currentTime).toBe("2027-01-15T06:00:00.000Z");
  });

  it("writes later time changes back to the URL", async () => {
    const onUrlUpdate = vi.fn<(e: UrlUpdateEvent) => void>();
    render(
      <NuqsTestingAdapter searchParams="" onUrlUpdate={onUrlUpdate} rateLimitFactor={0}>
        <Probe />
      </NuqsTestingAdapter>,
    );
    act(() => useScenarioStore.getState().setCurrentTime("2027-02-01T12:00:00.000Z"));
    await vi.waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(onUrlUpdate.mock.lastCall![0].searchParams.get("t")).toBe("2027-02-01T12:00:00.000Z");
  });
});
