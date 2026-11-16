import { create } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { AnalyzeRequestSchema } from "@lumen/sdk";
import { mockAnalysis } from "@lumen/sdk/mocks";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { formatDuration } from "@/lib/format";

import { CompareTable, type CompareColumn } from "./compare-table";

const day = 86_400_000;
const analyze = (lat: number, lon: number, startMs: number) =>
  mockAnalysis(
    create(AnalyzeRequestSchema, {
      site: { lat, lon, obsHeightM: 2 },
      range: {
        start: timestampFromDate(new Date(startMs)),
        end: timestampFromDate(new Date(startMs + 30 * day)),
        stepMinutes: 60,
      },
    }),
  );

const t0 = Date.UTC(2027, 0, 1);
const columns: CompareColumn[] = [
  {
    id: "a",
    label: "Mock ridge",
    detail: "2027-01-01 → 2027-01-31",
    color: "var(--color-site-1)",
    result: analyze(-89.45, -137.31, t0),
  },
  {
    id: "b",
    label: "Mock massif",
    detail: "2027-01-01 → 2027-01-31",
    color: "var(--color-site-2)",
    result: analyze(-86, 0, t0),
  },
];

describe("CompareTable (HU-04)", () => {
  it("has one column per scenario and one row per metric (AC1)", () => {
    render(<CompareTable columns={columns} />);
    const table = screen.getByRole("table", { name: /Comparison of 2 scenarios/ });
    expect(within(table).getByRole("columnheader", { name: /Mock ridge/ })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Mock massif/ })).toBeInTheDocument();
    expect(
      within(table).getByRole("rowheader", { name: /Longest dark period/ }),
    ).toBeInTheDocument();
    const ridgeDark = columns[0]!.result.metrics!.longestDarkH;
    expect(within(table).getAllByText(formatDuration(ridgeDark)).length).toBeGreaterThan(0);
  });

  it("marks the best value of each row with text, not only color (AC2)", () => {
    render(<CompareTable columns={columns} />);
    const row = screen.getByRole("rowheader", { name: /Time in sunlight/ }).closest("tr")!;
    const [ridge, massif] = columns.map((c) => c.result.metrics!.illuminationPct);
    const winner = ridge! > massif! ? 0 : 1;
    const cells = within(row).getAllByRole("cell");
    expect(within(cells[winner]!).getByText("Best")).toBeInTheDocument();
    expect(within(cells[1 - winner]!).queryByText("Best")).toBeNull();
  });

  it("shows a small horizon and an hour-by-hour strip per scenario (AC3)", () => {
    render(<CompareTable columns={columns} />);
    expect(screen.getAllByRole("img", { name: /^Horizon of / })).toHaveLength(2);
    expect(
      screen.getAllByRole("img", { name: /^Hours with sunlight and Earth contact at / }),
    ).toHaveLength(2);
  });
});
