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

  it("can start paused, with its own description, for a tour step", () => {
    mockReducedMotion(false);
    render(<HorizonScene autoPlay={false} label="Crater floor in shadow" />);
    expect(screen.getByRole("button", { name: "Play animation" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Crater floor in shadow" })).toBeInTheDocument();
  });

  it("counts days within the lunar day when asked", () => {
    mockReducedMotion(true);
    render(<HorizonScene dayCounter startDay={31} />);
    expect(screen.getByText("Day 1.5 of 29.5")).toBeInTheDocument();
  });
});
