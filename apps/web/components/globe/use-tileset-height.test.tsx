import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("cesium", () => ({
  Cartographic: { fromDegrees: (lon: number, lat: number) => ({ lon, lat, height: 0 }) },
}));

import { useTilesetHeight } from "./use-tileset-height";

const sample = vi.fn();
const requestRender = vi.fn();
const scene = { sampleHeightMostDetailed: sample, requestRender } as unknown as Parameters<
  typeof useTilesetHeight
>[0];

beforeEach(() => {
  requestRender.mockClear();
  sample.mockReset();
  sample.mockImplementation((pts: { height: number }[]) =>
    Promise.resolve(pts.map((p) => ({ ...p, height: 1949.9 }))),
  );
});

describe("useTilesetHeight", () => {
  it("returns the tileset's own height at the point once the tileset is ready", async () => {
    const { result } = renderHook(() => useTilesetHeight(scene, true, { lat: -89.9, lon: 10 }));
    await waitFor(() => expect(result.current).toBe(1949.9));
    expect(sample.mock.calls[0]![0][0]).toMatchObject({ lat: -89.9, lon: 10 });
  });

  it("does not sample before the tileset is ready, without a scene or without a point", () => {
    renderHook(() => useTilesetHeight(scene, false, { lat: 0, lon: 0 }));
    renderHook(() => useTilesetHeight(undefined, true, { lat: 0, lon: 0 }));
    renderHook(() => useTilesetHeight(scene, true, undefined));
    expect(sample).not.toHaveBeenCalled();
  });

  it("forgets the old height when the point changes, until the new one arrives", async () => {
    const { result, rerender } = renderHook(
      ({ lat }) => useTilesetHeight(scene, true, { lat, lon: 0 }),
      { initialProps: { lat: -89 } },
    );
    await waitFor(() => expect(result.current).toBe(1949.9));
    sample.mockImplementation(() => new Promise(() => {})); // la nueva muestra no llega
    rerender({ lat: -88 });
    expect(result.current).toBeUndefined();
  });

  it("stays undefined, without throwing, when the scene cannot sample", async () => {
    sample.mockImplementation(() => Promise.reject(new Error("unsupported")));
    const { result } = renderHook(() => useTilesetHeight(scene, true, { lat: 0, lon: 0 }));
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current).toBeUndefined();
  });

  it("keeps asking the scene for frames while the sample is pending, and stops when it arrives", async () => {
    vi.useFakeTimers();
    let resolve!: (v: { height: number }[]) => void;
    sample.mockImplementation(() => new Promise((r) => (resolve = r)));
    const { result, unmount } = renderHook(() => useTilesetHeight(scene, true, { lat: 0, lon: 0 }));
    await vi.advanceTimersByTimeAsync(350);
    expect(requestRender.mock.calls.length).toBeGreaterThanOrEqual(3);
    await act(async () => resolve([{ height: 12 }]));
    const calls = requestRender.mock.calls.length;
    await vi.advanceTimersByTimeAsync(500);
    expect(requestRender.mock.calls.length).toBe(calls);
    expect(result.current).toBe(12);
    unmount();
    vi.useRealTimers();
  });
});
