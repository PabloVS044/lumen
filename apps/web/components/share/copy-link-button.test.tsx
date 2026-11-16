import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CopyLinkButton } from "./copy-link-button";

afterEach(() => vi.unstubAllGlobals());

describe("CopyLinkButton", () => {
  it("copies the current URL and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CopyLinkButton />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /copy link/i })));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole("status")).toHaveTextContent(/link copied/i);
  });

  it("shows the link to copy by hand when the clipboard is blocked", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<CopyLinkButton />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /copy link/i })));
    expect(screen.getByRole("status")).toHaveTextContent(/copy it by hand/i);
    expect(screen.getByLabelText(/link to this view/i)).toHaveValue(window.location.href);
  });
});
