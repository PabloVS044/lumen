import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "./page";

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

describe("Landing", () => {
  it("names the product category in the h1", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /planner for lunar landing sites/i,
    );
  });

  it("sends the main action to the site picker", () => {
    render(<Home />);
    const [first] = screen.getAllByRole("link", { name: "Pick a landing site" });
    expect(first).toHaveAttribute("href", "/explore");
  });

  it("links every feature card to a real route", () => {
    render(<Home />);
    const hrefs = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => h.startsWith("/"));
    const routes = ["/explore", "/site", "/compare", "/search", "/learn", "/validation", "/about"];
    for (const href of hrefs) {
      expect(routes).toContain(href.split(/[?#]/)[0]);
    }
  });
});
