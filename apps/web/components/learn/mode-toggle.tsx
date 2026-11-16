"use client";

/**
 * Toggle Planner/Explorar (HU-11 AC1), ligado a `?mode=` (sección 12.3, lib/url-state.ts).
 * Owner: Producto/Diseño. Pensado para la cabecera de /site; allí cada vista decide qué mostrar en
 * cada modo (sección 18.2: Explorar simple, Planner con todos los detalles).
 */
import { useQueryStates } from "nuqs";

import { cn } from "@/lib/utils";
import { replaceUrl, siteSearchParams } from "@/lib/url-state";

const MODES = [
  { value: "planner", label: "Planner" },
  { value: "explore", label: "Explore" },
] as const;

export function ModeToggle({ className }: { className?: string }) {
  const [{ mode }, setQuery] = useQueryStates({ mode: siteSearchParams.mode }, replaceUrl);
  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn("inline-flex rounded-md border border-surface p-1 text-sm", className)}
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          aria-pressed={mode === m.value}
          onClick={() => void setQuery({ mode: m.value })}
          className="min-h-9 rounded px-3 text-muted transition-colors hover:text-text aria-pressed:bg-surface aria-pressed:text-text"
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
