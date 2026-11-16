import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const files = vi.hoisted(() => ({ downloadText: vi.fn() }));
vi.mock("@/lib/export/files", async (orig) => ({
  ...(await orig<typeof import("@/lib/export/files")>()),
  ...files,
}));

import { SiteExport } from "./site-export";

const site = { lat: -89.45, lon: -137.31, obsHeightM: 2 };
const range = { start: "2027-01-01", end: "2027-01-03" };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={createMockTransport()}>
      <QueryClientProvider client={client}>
        <SiteExport site={site} range={range} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

afterEach(() => vi.clearAllMocks());

describe("SiteExport", () => {
  it("exports the time series as CSV once the analysis is loaded", async () => {
    setup();
    const csv = screen.getByRole("button", { name: /time series \(csv\)/i });
    await vi.waitFor(() => expect(csv).toBeEnabled());
    fireEvent.click(csv);
    const [file, text, mime] = files.downloadText.mock.calls[0]!;
    expect(file).toBe("lumen-site--89.45--137.31-2027-01-01-2027-01-03-series.csv");
    expect(text.split("\r\n")[0]).toBe(
      "time_utc,sun_az_deg,sun_el_deg,sun_fraction,earth_az_deg,earth_el_deg,earth_fraction,horizon_at_sun_deg,horizon_at_earth_deg,eclipse_fraction,sun_visible,earth_visible,operable",
    );
    expect(mime).toBe("text/csv");
  });

  it("exports metrics CSV and full JSON", async () => {
    setup();
    const json = screen.getByRole("button", { name: /full result \(json\)/i });
    await vi.waitFor(() => expect(json).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /metrics \(csv\)/i }));
    fireEvent.click(json);
    expect(files.downloadText.mock.calls[0]![1]).toMatch(/^metric,value\r\n/);
    expect(JSON.parse(files.downloadText.mock.calls[1]![1]).metrics).toBeDefined();
  });

  it("prints the page to save it as PDF", () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    setup();
    fireEvent.click(screen.getByRole("button", { name: /print or save as pdf/i }));
    expect(print).toHaveBeenCalledOnce();
  });
});
