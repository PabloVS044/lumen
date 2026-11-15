import { TransportProvider } from "@connectrpc/connect-query";
import { createMockTransport } from "@lumen/sdk/mocks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import type { CheckFields } from "./format";
import { ValidationReport, ValidationTable } from "./validation-report";

// Entradas de prueba, no datos de la UI: la página solo muestra lo que devuelve el motor.
const check = (init: Partial<CheckFields>): CheckFields => ({
  id: "",
  description: "",
  tolerance: 0,
  maxError: 0,
  passed: false,
  ...init,
});

function withEngine(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <TransportProvider transport={createMockTransport()}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TransportProvider>
  );
}

describe("ValidationTable", () => {
  it("lists each check with its limit, worst error, margin and result", () => {
    render(
      <ValidationTable
        checks={[
          check({
            id: "ephemeris_earth_vs_horizons",
            tolerance: 0.01,
            maxError: 5.428e-7,
            passed: true,
          }),
          check({ id: "eclipse_vs_spice_occult", tolerance: 3, maxError: 4, passed: false }),
        ]}
      />,
    );
    // toHaveTextContent convierte los espacios duros en espacios normales.
    const [earth, eclipse] = screen.getAllByRole("row").slice(1);

    expect(within(earth!).getByRole("rowheader")).toHaveTextContent(
      "Earth azimuth and elevationvs JPL Horizons",
    );
    expect(earth).toHaveTextContent("0.01°");
    expect(earth).toHaveTextContent("5.4 × 10⁻⁷°");
    expect(earth).toHaveTextContent("18 000×");
    expect(earth).toHaveTextContent("Pass");

    expect(eclipse).toHaveTextContent("4 min");
    expect(eclipse).toHaveTextContent("Fail");
  });

  it("can be scrolled with the keyboard on narrow screens", () => {
    render(<ValidationTable checks={[check({ id: "eclipse_vs_spice_occult" })]} />);
    expect(screen.getByRole("region", { name: /validation checks/i })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });
});

describe("ValidationReport", () => {
  it("says so when the engine does not serve the report", async () => {
    render(withEngine(<ValidationReport />));
    expect(await screen.findByText(/does not serve the validation report/)).toBeInTheDocument();
  });
});
