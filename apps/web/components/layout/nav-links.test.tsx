import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NavList } from "./nav-links";

describe("NavList", () => {
  it("marks the current section, including its sub-pages", () => {
    render(<NavList pathname="/compare/shared" />);
    expect(screen.getByRole("link", { name: "Compare" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Explore" })).not.toHaveAttribute("aria-current");
  });

  it("marks nothing on the landing page", () => {
    render(<NavList pathname="/" />);
    for (const link of screen.getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });
});
