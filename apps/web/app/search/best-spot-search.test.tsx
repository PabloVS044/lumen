import { TransportProvider } from "@connectrpc/connect-query";
import { createRouterTransport } from "@connectrpc/connect";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";

vi.mock("./search-chart", () => ({
  SearchChart: (props: { label: string }) => (
    <div data-testid="search-chart" aria-label={props.label} />
  ),
}));

import { BestSpotSearch } from "./best-spot-search";

const URL_WITH_SITE = "?lat=-89.45&lon=-137.31&start=2027-01-01&end=2027-02-01";

function setup(search = URL_WITH_SITE, transport = createMockTransport()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <NuqsTestingAdapter searchParams={search}>
          <BestSpotSearch />
        </NuqsTestingAdapter>
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const run = () => fireEvent.click(screen.getByRole("button", { name: /find best spot/i }));

describe("BestSpotSearch", () => {
  it("prefills the center and range from the URL", () => {
    setup();
    expect(screen.getByLabelText(/center latitude/i)).toHaveValue(-89.45);
    expect(screen.getByLabelText(/center longitude/i)).toHaveValue(-137.31);
    expect(screen.getByLabelText(/^from/i)).toHaveValue("2027-01-01");
    expect(screen.getByLabelText(/search radius/i)).toHaveValue(5);
  });

  it("shows progress while the job runs, then the map, summary and ranked spots", async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/search radius/i), { target: { value: "1" } });
    run();
    expect(await screen.findByText(/computing horizons/i)).toBeInTheDocument();
    const results = await screen.findByRole(
      "region",
      { name: /search results/i },
      { timeout: 5000 },
    );
    expect(within(results).getByRole("status")).toHaveTextContent(
      /best spot: .* km from the center/i,
    );
    expect(screen.getByTestId("search-chart")).toBeInTheDocument();
    const rows = within(results).getAllByRole("row");
    expect(rows).toHaveLength(6); // cabecera + top 5
    const compare = within(rows[1]!).getByRole("link", { name: /add to compare/i });
    expect(compare.getAttribute("href")).toMatch(
      /^\/compare\?s=-89\.45,-137\.31,2027-01-01,2027-02-01&s=/,
    );
  });

  it("validates the contract limits before searching", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/search radius/i), { target: { value: "50" } });
    run();
    expect(screen.getByRole("alert")).toHaveTextContent(/fix the highlighted fields/i);
    expect(screen.getByLabelText(/search radius/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for a center when the URL has none", () => {
    setup("");
    run();
    expect(screen.getByLabelText(/center latitude/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("explains when the engine cannot search", async () => {
    setup(
      URL_WITH_SITE,
      createRouterTransport(() => {}),
    );
    run();
    expect(await screen.findByRole("alert")).toHaveTextContent(/cannot run best-spot searches/i);
  });
});
