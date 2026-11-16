import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Tour } from "./tour";
import { TOURS } from "./tours";

const peaks = TOURS.find((t) => t.id === "peaks")!;

describe("Tour", () => {
  it("starts on the first step with Back disabled", () => {
    render(<Tour tour={peaks} />);
    expect(screen.getByRole("heading", { level: 2, name: peaks.title })).toBeInTheDocument();
    expect(screen.getByText(`Step 1 of ${peaks.steps.length}`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: peaks.steps[0]!.title })).toBeVisible();
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  });

  it("walks forward and back through the steps", () => {
    render(<Tour tour={peaks} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(`Step 2 of ${peaks.steps.length}`)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: peaks.steps[1]!.title })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 3, name: peaks.steps[0]!.title })).toBeVisible();
  });

  it("ends on a link into the real tool and offers to start over", () => {
    render(<Tour tour={peaks} />);
    for (let i = 1; i < peaks.steps.length; i++) {
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    }
    const last = peaks.steps.at(-1)!;
    expect(screen.getByRole("link", { name: last.link!.label })).toHaveAttribute(
      "href",
      last.link!.href,
    );
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText(`Step 1 of ${peaks.steps.length}`)).toBeInTheDocument();
  });
});

describe("TOURS", () => {
  it("has the three tours of HU-11", () => {
    expect(TOURS.map((t) => t.id)).toEqual(["peaks", "earth", "lunar-day"]);
  });

  it("links only to /site with explore mode and real coordinates", () => {
    for (const step of TOURS.flatMap((t) => t.steps)) {
      if (!step.link) continue;
      const url = new URL(step.link.href, "https://lumen.example");
      expect(url.pathname).toBe("/site");
      expect(url.searchParams.get("mode")).toBe("explore");
      expect(Number(url.searchParams.get("lat"))).toBeLessThan(-89);
    }
  });
});
