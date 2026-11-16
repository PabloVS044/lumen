import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { CompareView } from "./compare-view";

function renderView(searchParams: string, onUrlUpdate = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <TransportProvider transport={createMockTransport()}>
      <QueryClientProvider client={client}>
        <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
          <CompareView />
        </NuqsTestingAdapter>
      </QueryClientProvider>
    </TransportProvider>,
  );
  return onUrlUpdate;
}

const scenariosIn = (spy: ReturnType<typeof vi.fn>) =>
  new URLSearchParams(
    (spy.mock.calls.at(-1)?.[0] as { queryString: string } | undefined)?.queryString,
  ).getAll("s");

const A = "s=-89.45,-137.31,2027-01-01,2027-01-31";
const B = "s=-86,0,2027-01-01,2027-01-31";

beforeEach(() => useScenarioStore.setState({ sites: [] }));

describe("/compare", () => {
  it("asks for scenarios and adds a catalog site to the URL", async () => {
    const spy = renderView("");
    expect(
      screen.getByRole("heading", { level: 2, name: "Scenarios (0 of 4)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Add at least 2 scenarios to compare them.")).toBeInTheDocument();

    fireEvent.focus(screen.getByRole("combobox", { name: "Search the catalog" }));
    fireEvent.click(await screen.findByRole("option", { name: /Mock massif/ }));
    await waitFor(() => expect(scenariosIn(spy)).toHaveLength(1));
    expect(scenariosIn(spy)[0]).toMatch(/^-86,0,\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/);
  });

  it("offers the sites chosen in Explore", async () => {
    useScenarioStore.setState({
      sites: [
        { id: "a", name: "A", lat: -89.45, lon: -137.31, obsHeightM: 2, color: "x" },
        { id: "b", name: "B", lat: -86, lon: 0, obsHeightM: 2, color: "y" },
      ],
    });
    const spy = renderView("");
    fireEvent.click(screen.getByRole("button", { name: "Use the 2 sites from Explore" }));
    await waitFor(() => expect(scenariosIn(spy)).toHaveLength(2));
  });

  it("compares two scenarios from the URL (HU-04)", async () => {
    renderView(`${A}&${B}`);
    const table = await screen.findByRole("table", { name: "Comparison of 2 scenarios" });
    expect(within(table).getByRole("columnheader", { name: /A\. Mock ridge/ })).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: /B\. Mock massif/ }),
    ).toBeInTheDocument();
  });

  it("adds the same site with later dates (M6, delayed mission)", async () => {
    const spy = renderView(`${A}&${B}`);
    const first = screen.getByRole("listitem", { name: /A\. / });
    fireEvent.change(within(first).getByLabelText("Delay"), { target: { value: "14" } });
    fireEvent.click(within(first).getByRole("button", { name: "Add delayed copy" }));
    await waitFor(() => expect(scenariosIn(spy)).toHaveLength(3));
    expect(scenariosIn(spy)[2]).toBe("-89.45,-137.31,2027-01-15,2027-02-14");
  });

  it("edits dates per scenario and removes scenarios", async () => {
    const spy = renderView(`${A}&${B}`);
    const second = screen.getByRole("listitem", { name: /B\. / });
    fireEvent.change(within(second).getByLabelText("End"), { target: { value: "2027-02-15" } });
    await waitFor(() => expect(scenariosIn(spy)[1]).toBe("-86,0,2027-01-01,2027-02-15"));

    fireEvent.click(within(second).getByRole("button", { name: "Remove B" }));
    await waitFor(() => expect(scenariosIn(spy)).toHaveLength(1));
  });

  it("names the best scenario for the chosen metric", async () => {
    renderView(`${A}&${B}&metric=illumination_pct`);
    expect(
      await screen.findByText(
        (_, el) =>
          el?.tagName === "P" &&
          /^Most time in sunlight: [AB]\. .+\(\d+\.\d%\)\.$/.test(el.textContent ?? ""),
      ),
    ).toBeInTheDocument();
  });
});
