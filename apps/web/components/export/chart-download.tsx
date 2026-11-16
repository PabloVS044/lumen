"use client";

/**
 * Botones PNG/SVG de un gráfico (M14, HU-12 AC2). Owner: Frontend Analysis (issue #43).
 * `ChartDownload` re-renderiza una opción de ECharts; `SvgDownload` exporta un <svg> de la página.
 */
import { useState, type RefObject } from "react";

import {
  echartsToPngDataUrl,
  echartsToSvg,
  svgElementToString,
  svgStringToPngDataUrl,
} from "@/lib/export/charts";
import { downloadDataUrl, downloadText, safeFilename } from "@/lib/export/files";

const background = () =>
  getComputedStyle(document.documentElement).getPropertyValue("--color-space").trim() || "#0b0e14";

const buttonClass =
  "rounded-md border border-surface px-2 py-0.5 text-xs text-muted hover:border-muted hover:text-text";

function Buttons({
  name,
  onPng,
  onSvg,
}: {
  name: string;
  onPng: () => Promise<void> | void;
  onSvg: () => void;
}) {
  const [error, setError] = useState(false);
  const run = (fn: () => Promise<void> | void) => async () => {
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
    }
  };
  return (
    <div
      className="flex items-center justify-end gap-2"
      role="group"
      aria-label={`Download ${name}`}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={run(onPng)}
        aria-label={`Download ${name} as PNG`}
      >
        PNG
      </button>
      <button
        type="button"
        className={buttonClass}
        onClick={run(onSvg)}
        aria-label={`Download ${name} as SVG`}
      >
        SVG
      </button>
      {error && (
        <span role="alert" className="text-xs text-bad">
          Could not export this chart.
        </span>
      )}
    </div>
  );
}

export function ChartDownload({ option, name }: { option: object; name: string }) {
  const file = safeFilename(`lumen ${name}`);
  return (
    <Buttons
      name={name}
      onPng={() => downloadDataUrl(`${file}.png`, echartsToPngDataUrl(option, background()))}
      onSvg={() => downloadText(`${file}.svg`, echartsToSvg(option, background()), "image/svg+xml")}
    />
  );
}

export function SvgDownload({
  svgRef,
  name,
  size,
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  name: string;
  /** Lado del PNG en px (el SVG conserva su viewBox). */
  size: number;
}) {
  const file = safeFilename(`lumen ${name}`);
  const text = () => {
    if (!svgRef.current) throw new Error("chart not rendered");
    return svgElementToString(svgRef.current, background());
  };
  return (
    <Buttons
      name={name}
      onPng={async () =>
        downloadDataUrl(`${file}.png`, await svgStringToPngDataUrl(text(), size, size))
      }
      onSvg={() => downloadText(`${file}.svg`, text(), "image/svg+xml")}
    />
  );
}
