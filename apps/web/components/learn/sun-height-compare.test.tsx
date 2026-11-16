import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SunHeightCompare } from "./sun-height-compare";

describe("SunHeightCompare", () => {
  it("compares the noon Sun at the visitor's latitude with Connecting ridge", () => {
    render(<SunHeightCompare />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "At noon the Sun climbs as high as 90° where you live, but only 2.1° at Connecting ridge.",
    );
  });

  it("updates when the latitude changes", () => {
    render(<SunHeightCompare />);
    fireEvent.change(screen.getByLabelText("Your latitude"), { target: { value: "60" } });
    expect(screen.getByText("60° N")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("as high as 53.4° where you live");
  });

  it("says when the noon Sun stays below the horizon", () => {
    render(<SunHeightCompare />);
    fireEvent.change(screen.getByLabelText("Your latitude"), { target: { value: "-80" } });
    expect(screen.getAllByText(/below the horizon/).length).toBeGreaterThan(0);
  });
});
