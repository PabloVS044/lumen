"use client";

/**
 * "Copy link" de un escenario (M13, HU-10). Owner: Frontend Analysis (issue #42).
 * La URL ya contiene todo el escenario (sitio, rango, instante, simulador, what-if); este botón
 * solo la copia. Si el navegador bloquea el portapapeles, muestra el enlace para copiarlo a mano.
 */
import { useState } from "react";

type State = "idle" | "copied" | "manual";

export function CopyLinkButton() {
  const [state, setState] = useState<State>("idle");
  const [href, setHref] = useState("");

  const copy = async () => {
    const url = window.location.href;
    setHref(url);
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("manual");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        onClick={copy}
        className="w-fit rounded-md border border-surface px-3 py-1.5 hover:border-muted"
      >
        Copy link
      </button>
      <span role="status" aria-live="polite" className="text-muted">
        {state === "copied" && "Link copied. It opens this exact view."}
        {state === "manual" && "Your browser blocked the clipboard. Copy it by hand:"}
      </span>
      {state === "manual" && (
        <input
          aria-label="Link to this view"
          readOnly
          value={href}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-md border border-surface bg-space px-2 py-1 font-mono text-xs"
        />
      )}
    </div>
  );
}
