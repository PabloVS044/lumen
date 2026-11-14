import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "./page";

describe("About", () => {
  it("has the credits anchor the footer links to", () => {
    render(<Page />);
    const heading = screen.getByRole("heading", { name: "Data and credits" });
    expect(heading.closest("section")).toHaveAttribute("id", "credits");
  });

  it("links every external source over https", () => {
    render(<Page />);
    const external = screen
      .getAllByRole("link")
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => !h.startsWith("/"));
    expect(external.length).toBeGreaterThan(0);
    for (const href of external) expect(href).toMatch(/^https:\/\//);
  });

  it("declares the use of AI and that NASA does not endorse the project", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: "Use of AI" })).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with or endorsed by NASA/)).toBeInTheDocument();
  });
});
