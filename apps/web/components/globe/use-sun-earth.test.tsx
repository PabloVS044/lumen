import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { Vec3 } from "./lighting";
import { useSunEarth } from "./use-sun-earth";

const wrapper = ({ children }: { children: ReactNode }) => (
  <TransportProvider transport={createMockTransport()}>
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {children}
    </QueryClientProvider>
  </TransportProvider>
);

const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;

async function sunAt(iso: string | null) {
  const { result } = renderHook(() => useSunEarth(iso), { wrapper });
  if (iso) await waitFor(() => expect(result.current.sun).toBeDefined());
  return result.current;
}

describe("useSunEarth", () => {
  it("does not query and returns nothing while currentTime is null", async () => {
    const r = await sunAt(null);
    expect(r.sun).toBeUndefined();
    expect(r.earth).toBeUndefined();
  });

  it("returns unit vectors", async () => {
    const r = await sunAt("2027-01-15T06:30:00Z");
    const s = r.sun!;
    expect(Math.hypot(s.x, s.y, s.z)).toBeCloseTo(1, 12);
  });

  it("interpolates between the hour before and the hour after", async () => {
    const before = (await sunAt("2027-01-15T06:00:00Z")).sun!;
    const mid = (await sunAt("2027-01-15T06:30:00Z")).sun!;
    const after = (await sunAt("2027-01-15T07:00:00Z")).sun!;
    expect(dot(mid, before)).toBeCloseTo(dot(mid, after), 6);
    expect(dot(mid, before)).toBeLessThan(1);
  });
});
