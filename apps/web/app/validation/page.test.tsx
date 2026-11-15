import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Page from "./page";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <TransportProvider transport={createMockTransport()}>
      <QueryClientProvider client={client}>
        <Page />
      </QueryClientProvider>
    </TransportProvider>,
  );
}

describe("Validation page", () => {
  it("covers results, method and limitations (HU-13)", () => {
    renderPage();
    for (const name of [
      "Results",
      "How the checks run",
      "Known differences from the references",
      "What is not validated yet",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
  });

  it("shows a loading status before the report arrives", () => {
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Loading the validation report");
  });
});
