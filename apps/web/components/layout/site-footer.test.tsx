import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  it("credits the data sources and links to the full list", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/LOLA/)).toBeInTheDocument();
    expect(screen.getByText(/SPICE/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Data and credits" })).toHaveAttribute(
      "href",
      "/about#credits",
    );
  });

  it("says the project is not endorsed by NASA", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/not endorsed by NASA/i)).toBeInTheDocument();
  });
});
