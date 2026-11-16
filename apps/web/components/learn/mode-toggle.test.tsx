import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";

import { ModeToggle } from "./mode-toggle";

function renderToggle(searchParams: string) {
  const onUrlUpdate = vi.fn();
  render(
    <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
      <ModeToggle />
    </NuqsTestingAdapter>,
  );
  return onUrlUpdate;
}

describe("ModeToggle", () => {
  it("defaults to Planner", () => {
    renderToggle("");
    expect(screen.getByRole("button", { name: "Planner" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Explore" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reads and writes ?mode= in the URL", async () => {
    const onUrlUpdate = renderToggle("?mode=planner");
    fireEvent.click(screen.getByRole("button", { name: "Explore" }));
    expect(screen.getByRole("button", { name: "Explore" })).toHaveAttribute("aria-pressed", "true");
    // nuqs agrupa las escrituras en la URL: llegan en el siguiente tick.
    await waitFor(() =>
      expect(onUrlUpdate.mock.calls.at(-1)?.[0].searchParams.get("mode")).toBe("explore"),
    );
  });
});
