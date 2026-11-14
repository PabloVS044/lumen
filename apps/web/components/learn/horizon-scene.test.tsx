import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HorizonScene } from "./horizon-scene";

function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HorizonScene", () => {
  it("describes the illustration for screen readers", () => {
    mockReducedMotion(false);
    render(<HorizonScene />);
    expect(screen.getByRole("img", { name: /south pole/i })).toBeInTheDocument();
  });

  it("plays by default and can be paused", () => {
    mockReducedMotion(false);
    render(<HorizonScene />);
    const button = screen.getByRole("button", { name: "Pause animation" });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: "Play animation" })).toBeInTheDocument();
  });

  it("starts paused when the visitor prefers reduced motion", () => {
    mockReducedMotion(true);
    render(<HorizonScene />);
    expect(screen.getByRole("button", { name: "Play animation" })).toBeInTheDocument();
  });
});
