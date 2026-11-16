import { TransportProvider } from "@connectrpc/connect-query";
import { EventType } from "@lumen/sdk";
import type { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useScenarioStore } from "@/stores/scenario-store";

import { TimeControls } from "./time-controls";

const T0 = "2027-01-15T06:00:00.000Z";
const START = "2027-01-01T00:00:00.000Z";
const END = "2027-02-01T00:00:00.000Z";
const search = `?t=${T0}&start=2027-01-01&end=2027-02-01`;

const sec = (iso: string) => ({ seconds: BigInt(Date.parse(iso) / 1000), nanos: 0 });
const events = [
  { type: EventType.SUNSET, time: sec("2027-01-15T05:00:00Z") },
  { type: EventType.EARTHSET, time: sec("2027-01-15T09:00:00Z") },
  { type: EventType.SUNRISE, time: sec("2027-01-20T00:00:00Z") },
];
// Transporte mínimo: solo responde ListEvents con una lista fija de prueba.
const eventsTransport = {
  unary: () => Promise.resolve({ message: { events } }),
  stream: () => Promise.reject(new Error("no streams")),
} as unknown as ReturnType<typeof createMockTransport>;

function setup(site?: { lat: number; lon: number }, query = search) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <NuqsTestingAdapter searchParams={query}>
      <TransportProvider transport={eventsTransport}>
        <QueryClientProvider client={client}>
          <TimeControls site={site} />
        </QueryClientProvider>
      </TransportProvider>
    </NuqsTestingAdapter>,
  );
}

const time = () => useScenarioStore.getState().currentTime;
const slider = () => screen.getByRole("slider", { name: /time \(utc\)/i });

beforeEach(() => {
  useScenarioStore.setState({ currentTime: null, playing: false, speedHoursPerSecond: 6 });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TimeControls initialisation", () => {
  it("starts at t from the URL, without autoplay", async () => {
    setup();
    await waitFor(() => expect(time()).toBe(T0));
    expect(useScenarioStore.getState().playing).toBe(false);
  });

  it("falls back to the start of the window when there is no t", async () => {
    setup(undefined, "?start=2027-01-01&end=2027-02-01");
    await waitFor(() => expect(time()).toBe(START));
  });

  it("uses a slower default speed with prefers-reduced-motion", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: /reduce/.test(q) }));
    setup();
    await waitFor(() => expect(useScenarioStore.getState().speedHoursPerSecond).toBe(1));
  });
});

describe("TimeControls keyboard", () => {
  it("moves by 1 hour, 1 day and to the ends of the window", async () => {
    setup();
    await waitFor(() => expect(time()).toBe(T0));
    fireEvent.keyDown(slider(), { key: "ArrowRight" });
    expect(time()).toBe("2027-01-15T07:00:00.000Z");
    fireEvent.keyDown(slider(), { key: "PageDown" });
    expect(time()).toBe("2027-01-14T07:00:00.000Z");
    fireEvent.keyDown(slider(), { key: "Home" });
    expect(time()).toBe(START);
    fireEvent.keyDown(slider(), { key: "End" });
    expect(time()).toBe(END);
  });

  it("toggles play with Space", async () => {
    setup();
    await waitFor(() => expect(time()).toBe(T0));
    fireEvent.keyDown(slider(), { key: " " });
    expect(useScenarioStore.getState().playing).toBe(true);
  });
});

describe("TimeControls controls", () => {
  it("play/pause button reflects and flips the store", async () => {
    setup();
    await waitFor(() => expect(time()).toBe(T0));
    const play = screen.getByRole("button", { name: /play/i });
    expect(play).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(play);
    expect(useScenarioStore.getState().playing).toBe(true);
    expect(screen.getByRole("button", { name: /pause/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("writes the chosen speed to the store", async () => {
    setup();
    await waitFor(() => expect(time()).toBe(T0));
    fireEvent.change(screen.getByLabelText(/speed/i), { target: { value: "24" } });
    expect(useScenarioStore.getState().speedHoursPerSecond).toBe(24);
  });

  it("sets an exact UTC date and clamps it to the window", async () => {
    setup();
    await waitFor(() => expect(time()).toBe(T0));
    const input = screen.getByLabelText(/exact date/i);
    fireEvent.change(input, { target: { value: "2027-01-10T12:30" } });
    expect(time()).toBe("2027-01-10T12:30:00.000Z");
    fireEvent.change(input, { target: { value: "2028-01-01T00:00" } });
    expect(time()).toBe(END);
  });
});

describe("TimeControls playback", () => {
  it("advances at the chosen speed and writes to the store at most ~10 times per second", async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => callbacks.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    setup();
    await waitFor(() => expect(time()).toBe(T0));
    const writes = vi.fn();
    const unsub = useScenarioStore.subscribe((s, p) => s.currentTime !== p.currentTime && writes());
    act(() => useScenarioStore.getState().setPlaying(true));
    // 1 s de reloj a ~60 fps
    for (let ts = 0; ts <= 1000; ts += 16) {
      const cb = callbacks.shift();
      act(() => cb?.(ts));
    }
    unsub();
    // 6 h/s durante ~1 s
    const hours = (Date.parse(time()!) - Date.parse(T0)) / 3_600_000;
    expect(hours).toBeGreaterThan(5.3); // el store va hasta 100 ms atrasado por el límite de 10 Hz
    expect(hours).toBeLessThan(6.5);
    expect(writes.mock.calls.length).toBeLessThanOrEqual(12);
  });

  it("pauses at the end of the window", async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => callbacks.push(cb));
    vi.stubGlobal("cancelAnimationFrame", () => {});
    useScenarioStore.setState({ speedHoursPerSecond: 72 });
    setup(undefined, "?t=2027-01-31T23:00:00Z&start=2027-01-01&end=2027-02-01");
    await waitFor(() => expect(time()).toBe("2027-01-31T23:00:00.000Z"));
    act(() => useScenarioStore.getState().setPlaying(true));
    act(() => callbacks.shift()?.(0));
    act(() => callbacks.shift()?.(1000));
    expect(time()).toBe(END);
    expect(useScenarioStore.getState().playing).toBe(false);
  });
});

describe("TimeControls next event", () => {
  it("jumps to the next event after the current time and pauses", async () => {
    setup({ lat: -89.45, lon: -137.31 });
    await waitFor(() => expect(time()).toBe(T0));
    const next = await screen.findByRole("button", { name: /next.*earthset/i });
    expect(next).toBeEnabled();
    act(() => useScenarioStore.getState().setPlaying(true));
    fireEvent.click(next);
    expect(time()).toBe("2027-01-15T09:00:00.000Z");
    expect(useScenarioStore.getState().playing).toBe(false);
  });

  it("is disabled with an explanation when no site is selected", async () => {
    setup();
    await waitFor(() => expect(time()).toBe(T0));
    const next = screen.getByRole("button", { name: /next event/i });
    expect(next).toBeDisabled();
    expect(screen.getByText(/select a site/i)).toBeInTheDocument();
  });
});
