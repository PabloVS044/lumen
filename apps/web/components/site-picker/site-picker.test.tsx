import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { SITE_COLORS } from "./site-picker-model";
import { SitePicker } from "./site-picker";

function renderPicker(props: Parameters<typeof SitePicker>[0] = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <TransportProvider transport={createMockTransport()}>
      <QueryClientProvider client={client}>
        <SitePicker {...props} />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

const search = () => screen.getByRole("combobox", { name: "Search the catalog" });

beforeEach(() => useScenarioStore.setState({ sites: [] }));

describe("SitePicker catalog search", () => {
  it("lists the catalog and narrows it as you type", async () => {
    renderPicker();
    fireEvent.focus(search());
    expect(await screen.findByRole("option", { name: /Mock ridge/ })).toBeInTheDocument();
    const listbox = screen.getByRole("listbox", { name: "Catalog sites" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(4);

    fireEvent.change(search(), { target: { value: "massif" } });
    expect(within(listbox).getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: /Mock massif/ })).toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    renderPicker();
    fireEvent.focus(search());
    await screen.findAllByRole("option");
    fireEvent.change(search(), { target: { value: "zzz" } });
    expect(screen.getByText("No catalog site matches “zzz”.")).toBeInTheDocument();
  });

  it("goes to the last option with ArrowUp when none is active", async () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });
    fireEvent.focus(search());
    await screen.findAllByRole("option");
    fireEvent.keyDown(search(), { key: "ArrowUp" });
    fireEvent.keyDown(search(), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "mock-mare" }));
  });

  it("picks a site with the keyboard", async () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });
    fireEvent.focus(search());
    await screen.findAllByRole("option");

    fireEvent.keyDown(search(), { key: "ArrowDown" });
    fireEvent.keyDown(search(), { key: "ArrowDown" });
    expect(search()).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: /Mock massif/ }).id,
    );
    fireEvent.keyDown(search(), { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith({
      id: "mock-massif",
      name: "Mock massif (south pole)",
      lat: -86,
      lon: 0,
    });
  });
});

describe("SitePicker coordinates (HU-01)", () => {
  const fill = (lat: string, lon: string) => {
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: lat } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: lon } });
    fireEvent.click(screen.getByRole("button", { name: "Use these coordinates" }));
  };

  it("explains an invalid latitude and does not select", () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });
    fill("-91", "0");
    expect(screen.getByLabelText("Latitude")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Latitude must be between -90 and 90.")).toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("accepts DMS and 0–360 longitudes", () => {
    const onSelect = vi.fn();
    renderPicker({ onSelect });
    fill("89°27'S", "222°41'E");
    expect(onSelect).toHaveBeenCalledTimes(1);
    const picked = onSelect.mock.calls[0]![0];
    expect(picked.name).toBe("Custom point");
    expect(picked.lat).toBeCloseTo(-89.45);
    expect(picked.lon).toBeCloseTo(-137.3167, 3);
  });
});

describe("SitePicker active sites", () => {
  it("adds picks to the comparison with their own color when no handler is given", async () => {
    renderPicker();
    fireEvent.focus(search());
    fireEvent.click(await screen.findByRole("option", { name: /Mock ridge/ }));

    expect(useScenarioStore.getState().sites).toEqual([
      expect.objectContaining({ id: "mock-ridge", color: SITE_COLORS[0], obsHeightM: 2 }),
    ]);
    const list = screen.getByRole("list", { name: "Active sites" });
    expect(within(list).getByRole("link", { name: /Mock ridge/ })).toHaveAttribute(
      "href",
      "/site?lat=-89.45&lon=-137.31",
    );

    fireEvent.click(within(list).getByRole("button", { name: "Remove Mock ridge (south pole)" }));
    expect(useScenarioStore.getState().sites).toEqual([]);
  });

  it("does not add the same site twice", async () => {
    renderPicker();
    fireEvent.focus(search());
    fireEvent.click(await screen.findByRole("option", { name: /Mock ridge/ }));
    fireEvent.focus(search());
    fireEvent.click(await screen.findByRole("option", { name: /Mock ridge/ }));
    expect(useScenarioStore.getState().sites).toHaveLength(1);
  });

  it("explains the limit of four sites", async () => {
    useScenarioStore.setState({
      sites: SITE_COLORS.map((color, i) => ({
        name: `Point ${i}`,
        lat: -80 - i,
        lon: 0,
        obsHeightM: 2,
        color,
      })),
    });
    renderPicker();
    fireEvent.focus(search());
    fireEvent.click(await screen.findByRole("option", { name: /Mock ridge/ }));
    expect(useScenarioStore.getState().sites).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveTextContent(
      "The comparison holds up to 4 sites. Remove one first.",
    );
  });
});
