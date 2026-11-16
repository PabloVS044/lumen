import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "./page";

describe("Learn page", () => {
  it("offers the three tours of HU-11 and the Earth versus Moon comparison", () => {
    render(<Page />);
    for (const name of [
      "Peaks of near-constant sunlight",
      "Why Earth rises and sets",
      "A lunar day in 30 seconds",
      "How high the Sun gets",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
  });

  it("links each chip to a section on the page", () => {
    render(<Page />);
    const nav = screen.getByRole("navigation", { name: "Tours" });
    for (const link of nav.querySelectorAll("a")) {
      const id = link.getAttribute("href")!.slice(1);
      expect(document.getElementById(id)).not.toBeNull();
    }
  });
});
