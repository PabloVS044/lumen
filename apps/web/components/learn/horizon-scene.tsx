"use client";

/**
 * HorizonScene — "demo animada" de la landing (sección 12.1), reutilizable en /learn (M11).
 * Owner: Producto/Diseño. Esquema didáctico con relieve inventado, no datos del motor:
 * ver horizon-scene-model.ts. Respeta prefers-reduced-motion y tiene botón de pausa (WCAG 2.2.2).
 */
import { Pause, Play } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type Ref } from "react";

import { cn } from "@/lib/utils";

import {
  EARTH_RADIUS_DEG,
  SCENE,
  SUN_RADIUS_DEG,
  azToX,
  earthAt,
  elToY,
  ridgePath,
  sunAt,
  terrainPath,
  visibleFraction,
} from "./horizon-scene-model";

/** Segundos de animación por día terrestre: un día lunar dura unos 18 s. */
const SECONDS_PER_DAY = 0.6;
/** Instante inicial y fotograma fijo con movimiento reducido: Sol y Tierra a la vista. */
const START_DAY = 3;
const TERRAIN = terrainPath();
const RIDGE = ridgePath();
const CARDINALS = [
  { label: "S", x: 8, anchor: "start" },
  { label: "W", x: azToX(270), anchor: "middle" },
  { label: "N", x: azToX(0), anchor: "middle" },
  { label: "E", x: azToX(90), anchor: "middle" },
  { label: "S", x: SCENE.width - 8, anchor: "end" },
] as const;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia?.(REDUCED_MOTION);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia?.(REDUCED_MOTION).matches ?? false,
    () => false,
  );
}

function frame(day: number) {
  const sun = sunAt(day);
  const earth = earthAt(day);
  return {
    sun: `translate(${azToX(sun.az).toFixed(1)} ${elToY(sun.el).toFixed(1)})`,
    earth: `translate(${azToX(earth.az).toFixed(1)} ${elToY(earth.el).toFixed(1)})`,
    sunInView: visibleFraction(sun, SUN_RADIUS_DEG) >= 0.5,
    earthInView: visibleFraction(earth, EARTH_RADIUS_DEG) >= 0.5,
  };
}

const INITIAL = frame(START_DAY);

function StatusPill({
  ref,
  inView,
  label,
  dot,
}: {
  ref: Ref<HTMLSpanElement>;
  inView: boolean;
  label: string;
  dot: string;
}) {
  return (
    <span
      ref={ref}
      data-on={inView}
      className="group inline-flex items-center gap-2 rounded-full border border-surface bg-space/80 px-3 py-1 font-mono text-xs text-muted transition-colors data-[on=true]:text-text"
    >
      <span
        className={cn("size-2 rounded-full opacity-25 group-data-[on=true]:opacity-100", dot)}
      />
      {label}
      <span className="group-data-[on=true]:hidden">hidden</span>
      <span className="hidden group-data-[on=true]:inline">in view</span>
    </span>
  );
}

export function HorizonScene({ className }: { className?: string }) {
  const uid = useId().replace(/[^\w-]/g, "");
  const reduceMotion = usePrefersReducedMotion();
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? !reduceMotion;

  const sunRef = useRef<SVGGElement>(null);
  const earthRef = useRef<SVGGElement>(null);
  const sunPillRef = useRef<HTMLSpanElement>(null);
  const earthPillRef = useRef<HTMLSpanElement>(null);
  const dayRef = useRef(START_DAY);

  useEffect(() => {
    if (!playing || typeof requestAnimationFrame !== "function") return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      // Tope de 100 ms por fotograma: al volver a una pestaña oculta no hay saltos.
      if (last !== null) dayRef.current += Math.min(now - last, 100) / 1000 / SECONDS_PER_DAY;
      last = now;
      const f = frame(dayRef.current);
      sunRef.current?.setAttribute("transform", f.sun);
      earthRef.current?.setAttribute("transform", f.earth);
      if (sunPillRef.current) sunPillRef.current.dataset.on = String(f.sunInView);
      if (earthPillRef.current) earthPillRef.current.dataset.on = String(f.earthInView);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden rounded-xl border border-surface bg-panel sm:aspect-[3/1] lg:aspect-[4/1]",
        className,
      )}
    >
      <div
        role="img"
        aria-label="Illustration of the horizon seen from near the lunar south pole. The Sun circles just above the ridges once per lunar day and disappears whenever terrain is in the way. Earth bobs up and down near the north horizon, so direct contact comes and goes."
        className="absolute inset-0"
      >
        <svg
          viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          focusable="false"
          className="absolute inset-0 size-full"
        >
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-space)" }} />
              <stop offset="1" style={{ stopColor: "var(--color-panel)" }} />
            </linearGradient>
            <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-surface)" }} />
              <stop offset="1" style={{ stopColor: "var(--color-space)" }} />
            </linearGradient>
            <radialGradient id={`${uid}-sun-glow`}>
              <stop offset="0" style={{ stopColor: "var(--color-sun)", stopOpacity: 0.5 }} />
              <stop offset="1" style={{ stopColor: "var(--color-sun)", stopOpacity: 0 }} />
            </radialGradient>
            <radialGradient id={`${uid}-earth-glow`}>
              <stop offset="0.5" style={{ stopColor: "var(--color-earth)", stopOpacity: 0.3 }} />
              <stop offset="1" style={{ stopColor: "var(--color-earth)", stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          <rect width={SCENE.width} height={SCENE.height} fill={`url(#${uid}-sky)`} />
          <line
            x1="0"
            x2={SCENE.width}
            y1={SCENE.horizonY}
            y2={SCENE.horizonY}
            strokeDasharray="4 8"
            className="stroke-muted/40"
          />
          <g ref={sunRef} transform={INITIAL.sun}>
            <circle r="48" fill={`url(#${uid}-sun-glow)`} />
            <circle r={SUN_RADIUS_DEG * SCENE.pxPerDeg} className="fill-sun" />
          </g>
          <g ref={earthRef} transform={INITIAL.earth}>
            <circle r={EARTH_RADIUS_DEG * SCENE.pxPerDeg * 1.6} fill={`url(#${uid}-earth-glow)`} />
            <circle r={EARTH_RADIUS_DEG * SCENE.pxPerDeg} className="fill-earth" />
          </g>
          <path d={TERRAIN} fill={`url(#${uid}-ground)`} />
          <path d={RIDGE} fill="none" strokeWidth="1.5" className="stroke-muted/50" />
          {CARDINALS.map((c) => (
            <text
              key={`${c.label}-${c.x}`}
              x={c.x}
              y={SCENE.height - 16}
              textAnchor={c.anchor}
              className="fill-muted font-mono text-base"
            >
              {c.label}
            </text>
          ))}
        </svg>
        <div aria-hidden="true" className="absolute top-3 left-3 flex flex-wrap gap-2">
          <StatusPill ref={sunPillRef} inView={INITIAL.sunInView} label="Sun" dot="bg-sun" />
          <StatusPill
            ref={earthPillRef}
            inView={INITIAL.earthInView}
            label="Earth"
            dot="bg-earth"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setChoice(!playing)}
        aria-label={playing ? "Pause animation" : "Play animation"}
        className="absolute top-1 right-1 grid size-11 place-items-center rounded-md text-muted transition-colors hover:bg-space/60 hover:text-text"
      >
        {playing ? (
          <Pause aria-hidden="true" className="size-4" />
        ) : (
          <Play aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}
