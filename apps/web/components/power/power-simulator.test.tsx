import { TransportProvider } from "@connectrpc/connect-query";
import { createRouterTransport } from "@connectrpc/connect";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./power-chart", () => ({
  PowerChart: (props: { label: string }) => (
    <div data-testid="power-chart" aria-label={props.label} />
  ),
}));

import { PowerSimulator } from "./power-simulator";

const range = { start: "2027-01-01", end: "2027-01-31" };

function setup(
  site = { lat: -89.45, lon: -137.31, obsHeightM: 2 },
  transport: ReturnType<typeof createMockTransport> = createMockTransport(),
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <PowerSimulator site={site} range={range} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const run = () => fireEvent.click(screen.getByRole("button", { name: /run simulation/i }));

describe("PowerSimulator", () => {
  it("starts from the documented small-lander preset", () => {
    setup();
    expect(screen.getByLabelText(/battery capacity/i)).toHaveValue(2000);
    expect(screen.getByLabelText(/load in darkness/i)).toHaveValue(60);
  });

  it("runs the simulation and shows verdict, chart, summary and table", async () => {
    setup();
    run();
    expect(await screen.findByRole("status")).toHaveTextContent(/survives|runs out of power/i);
    expect(screen.getByTestId("power-chart")).toBeInTheDocument();
    expect(screen.getByText(/lowest charge$/i)).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(30);
  });

  it("reports a brownout for a tiny battery", async () => {
    setup();
    fireEvent.change(screen.getByLabelText(/battery capacity/i), { target: { value: "50" } });
    run();
    expect(await screen.findByRole("status")).toHaveTextContent(/runs out of power on/i);
    expect(screen.getByText(/load not served/i)).toBeInTheDocument();
  });

  it("blocks invalid values with the contract rules", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/panel efficiency/i), { target: { value: "1.5" } });
    run();
    expect(screen.getByRole("alert")).toHaveTextContent(/fix the highlighted fields/i);
    expect(screen.getByLabelText(/panel efficiency/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("asks for an azimuth only for a fixed vertical panel", () => {
    setup();
    expect(screen.queryByLabelText(/panel azimuth/i)).toBeNull();
    fireEvent.change(screen.getByLabelText(/panel orientation/i), { target: { value: "3" } });
    expect(screen.getByLabelText(/panel azimuth/i)).toBeInTheDocument();
  });

  it("warns that vertical panels suit polar sites when used near the equator", () => {
    setup({ lat: 0.67, lon: 23.47, obsHeightM: 2 });
    expect(screen.getByText(/vertical panels are meant for polar sites/i)).toBeInTheDocument();
  });

  it("explains when the engine cannot simulate yet", async () => {
    setup(
      undefined,
      createRouterTransport(() => {}),
    );
    run();
    expect(await screen.findByRole("alert")).toHaveTextContent(/terrain horizon/i);
  });
});
