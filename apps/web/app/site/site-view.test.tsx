import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";

vi.mock("./site-charts", () => ({ SiteCharts: () => <div data-testid="site-charts" /> }));

import { SiteView } from "./site-view";

function renderView(searchParams: string, onUrlUpdate: OnUrlUpdateFunction = () => {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <TransportProvider transport={createMockTransport()}>
      <QueryClientProvider client={client}>
        <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
          <SiteView />
        </NuqsTestingAdapter>
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const lastQuery = (spy: ReturnType<typeof vi.fn>) =>
  new URLSearchParams(
    (spy.mock.calls.at(-1)?.[0] as { queryString: string } | undefined)?.queryString,
  );

/** nuqs escribe la URL en una cola asíncrona. */
const expectParam = (spy: ReturnType<typeof vi.fn>, key: string, value: string) =>
  waitFor(() => expect(lastQuery(spy).get(key)).toBe(value));

describe("/site without a site", () => {
  it("asks for one and writes the pick to the URL", async () => {
    const onUrlUpdate = vi.fn();
    renderView("", onUrlUpdate);
    expect(screen.getByRole("heading", { level: 2, name: "Choose a site" })).toBeInTheDocument();

    fireEvent.focus(screen.getByRole("combobox", { name: "Search the catalog" }));
    fireEvent.click(await screen.findByRole("option", { name: /Mock massif/ }));

    await expectParam(onUrlUpdate, "lat", "-86");
    expect(lastQuery(onUrlUpdate).get("lon")).toBe("0");
  });

  it("rejects a latitude outside the Moon's range", () => {
    renderView("lat=95&lon=0");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This link has a latitude of 95°, outside -90° to 90°. Choose another site.",
    );
  });
});

describe("/site header", () => {
  it("names a catalog site and shows its coordinates", async () => {
    renderView("lat=-89.45&lon=-137.31");
    expect(
      await screen.findByRole("heading", { level: 2, name: "Mock ridge (south pole)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("89.450° S, 137.310° W")).toBeInTheDocument();
    expect(screen.getByText("Observer 2 m above the ground")).toBeInTheDocument();
  });

  it("matches the catalog when the URL uses a 0–360 longitude", async () => {
    renderView("lat=-89.45&lon=222.69");
    expect(
      await screen.findByRole("heading", { level: 2, name: "Mock ridge (south pole)" }),
    ).toBeInTheDocument();
  });

  it("closes the change-site panel after a pick", async () => {
    const onUrlUpdate = vi.fn();
    renderView("lat=-85&lon=10", onUrlUpdate);
    const summary = screen.getByText("Change site");
    const details = summary.closest("details")!;
    details.open = true;

    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "-86" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "350" } });
    fireEvent.click(screen.getByRole("button", { name: "Use these coordinates" }));

    await expectParam(onUrlUpdate, "lon", "-10");
    expect(details.open).toBe(false);
    expect(summary).toHaveFocus();
  });

  it("calls an unknown point a custom point", () => {
    renderView("lat=-85&lon=10");
    expect(screen.getByRole("heading", { level: 2, name: "Custom point" })).toBeInTheDocument();
  });

  it("shows the terrain coverage before any calculation (HU-01 AC4)", async () => {
    renderView("lat=-89.45&lon=-137.31");
    expect(await screen.findByText("MOCK")).toBeInTheDocument();
    expect(screen.getByText("5 m")).toBeInTheDocument();
    expect(screen.getByText("Synthetic data (SDK mock)")).toBeInTheDocument();
  });

  it("flags a period that ends before it starts", () => {
    renderView("lat=-85&lon=10&start=2027-03-01&end=2027-01-01");
    expect(screen.getByText("The end date must be after the start date.")).toBeInTheDocument();
  });
});

describe("/site period and summary", () => {
  it("writes a default 30-day period when the URL has none", async () => {
    const onUrlUpdate = vi.fn();
    renderView("lat=-85&lon=10", onUrlUpdate);
    await waitFor(() => {
      const q = lastQuery(onUrlUpdate);
      expect(q.get("start")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const days = (Date.parse(q.get("end")!) - Date.parse(q.get("start")!)) / 86_400_000;
      expect(days).toBe(30);
    });
  });

  it("shows key figures, countdowns, metrics and the charts", async () => {
    renderView("lat=-89.45&lon=-137.31&start=2027-01-01&end=2027-01-31");
    expect(await screen.findByLabelText("Key figures")).toBeInTheDocument();
    expect(await screen.findByRole("group", { name: "Sun" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Sunlight" })).toBeInTheDocument();
    expect(screen.getByTestId("site-charts")).toBeInTheDocument();
  });
});
