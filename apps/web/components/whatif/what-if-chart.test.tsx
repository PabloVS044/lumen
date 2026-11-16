import { TransportProvider } from "@connectrpc/connect-query";
import { createRouterTransport } from "@connectrpc/connect";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./whatif-chart", () => ({
  WhatIfLineChart: (props: { label: string }) => (
    <div data-testid="whatif-panel" aria-label={props.label} />
  ),
}));

import { WhatIfChart } from "./what-if-chart";

const site = { lat: -89.45, lon: -137.31, obsHeightM: 2 };
const range = { start: "2027-01-01", end: "2027-01-31" };

function setup(transport: ReturnType<typeof createMockTransport> = createMockTransport()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <WhatIfChart site={site} range={range} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const run = () => fireEvent.click(screen.getByRole("button", { name: /evaluate delays/i }));

describe("WhatIfChart", () => {
  it("defaults the nominal landing to the range start and three metrics", () => {
    setup();
    expect(screen.getByLabelText(/nominal landing/i)).toHaveValue("2027-01-01");
    expect(screen.getAllByRole("checkbox", { checked: true })).toHaveLength(3);
  });

  it("evaluates delays and shows one panel per metric, summary and table", async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/maximum delay/i), { target: { value: "10" } });
    run();
    expect(await screen.findByRole("status")).toHaveTextContent(/recommended/i);
    expect(screen.getAllByTestId("whatif-panel")).toHaveLength(3);
    // cabecera + 11 retrasos (0..10 días)
    expect(screen.getAllByRole("row")).toHaveLength(12);
  });

  it("adds the battery column and shading legend when asked", async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/maximum delay/i), { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText(/also check the battery/i));
    run();
    await screen.findByRole("status");
    expect(screen.getByText(/shaded: delays where the battery runs out/i)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Battery" })).toBeInTheDocument();
  });

  it("requires at least one metric", () => {
    setup();
    for (const box of screen.getAllByRole("checkbox", { checked: true })) fireEvent.click(box);
    run();
    expect(screen.getByRole("alert")).toHaveTextContent(/fix the highlighted fields/i);
    expect(screen.getByText(/choose at least one metric/i)).toBeInTheDocument();
  });

  it("rejects ranges longer than the engine allows", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/maximum delay/i), { target: { value: "365" } });
    fireEvent.change(screen.getByLabelText(/mission duration/i), { target: { value: "366" } });
    run();
    expect(screen.getByText(/at most 730 days/i)).toBeInTheDocument();
  });

  it("explains when the engine cannot evaluate yet", async () => {
    setup(createRouterTransport(() => {}));
    run();
    expect(await screen.findByRole("alert")).toHaveTextContent(/terrain horizon/i);
  });
});
