import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { useSiteVisibility, visibilityAt } from "./site-visibility";

const sec = (iso: string) => ({ seconds: BigInt(Date.parse(iso) / 1000), nanos: 0 });
const series = {
  time: [sec("2027-01-15T06:00:00Z"), sec("2027-01-15T07:00:00Z"), sec("2027-01-15T08:00:00Z")],
  sunVisible: [true, false, false],
  earthVisible: [false, false, true],
};

describe("visibilityAt", () => {
  it("reads the engine flags of the sample closest to the time", () => {
    expect(visibilityAt(series, Date.parse("2027-01-15T06:10:00Z"))).toEqual({
      sun: true,
      earth: false,
    });
    expect(visibilityAt(series, Date.parse("2027-01-15T07:55:00Z"))).toEqual({
      sun: false,
      earth: true,
    });
  });

  it("does not claim anything outside the analysed range or without data", () => {
    expect(visibilityAt(series, Date.parse("2027-02-20T00:00:00Z"))).toBeUndefined();
    expect(visibilityAt(undefined, 0)).toBeUndefined();
    expect(visibilityAt({ time: [], sunVisible: [], earthVisible: [] }, 0)).toBeUndefined();
  });
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <TransportProvider transport={createMockTransport()}>
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  </TransportProvider>
);

const range = { start: "2027-01-01", end: "2027-01-31" };

beforeEach(() => {
  useScenarioStore.setState({ currentTime: "2027-01-15T06:00:00.000Z" });
});

describe("useSiteVisibility", () => {
  it("returns nothing until a site is selected", () => {
    const { result } = renderHook(() => useSiteVisibility(undefined, range), { wrapper });
    expect(result.current).toBeUndefined();
  });

  it("returns the engine's Sun and Earth visibility at currentTime for the selected site", async () => {
    const { result } = renderHook(() => useSiteVisibility({ lat: -89.45, lon: -137.31 }, range), {
      wrapper,
    });
    await waitFor(() => expect(result.current).toBeDefined());
    expect(typeof result.current!.sun).toBe("boolean");
    expect(typeof result.current!.earth).toBe("boolean");
  });
});
