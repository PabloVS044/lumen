"use client";

/**
 * HorizonScene — "demo animada" de la landing (sección 12.1) y escena de los tours de /learn (M11).
 * Owner: Producto/Diseño. Esquema didáctico con relieve inventado, no datos del motor:
 * ver horizon-scene-model.ts. Respeta prefers-reduced-motion y tiene botón de pausa (WCAG 2.2.2).
 */
import { Pause, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
  type RefObject,
} from "react";

import { cn } from "@/lib/utils";

import {
  EARTH_RADIUS_DEG,
  LUNAR_DAY_D,
  SCENE,
  SUN_RADIUS_DEG,
  azToX,
  earthAt,
  earthTrackPath,
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
const EARTH_TRACK = earthTrackPath();
const CARDINALS = [
  { label: "S", x: 8, anchor: "start" },
  { label: "W", x: azToX(270), anchor: "middle" },
  { label: "N", x: azToX(0), anchor: "middle" },
  { label: "E", x: azToX(90), anchor: "middle" },
  { label: "S", x: SCENE.width - 8, anchor: "end" },
] as const;

const DEFAULT_LABEL =
  "Illustration of the horizon seen from near the lunar south pole. The Sun circles just above the ridges once per lunar day and disappears whenever terrain is in the way. Earth bobs up and down near the north horizon, so direct contact comes and goes.";

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

/** Si el elemento está en pantalla; sin IntersectionObserver (tests, navegadores viejos), siempre sí. */
function useInView(ref: RefObject<Element | null>) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver(([entry]) =>
      setInView(entry?.isIntersecting ?? true),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

function frame(day: number, lift: number) {
  const sun = sunAt(day);
  const earth = earthAt(day);
  return {
    sun: `translate(${azToX(sun.az).toFixed(1)} ${elToY(sun.el).toFixed(1)})`,
    earth: `translate(${azToX(earth.az).toFixed(1)} ${elToY(earth.el).toFixed(1)})`,
    sunInView: visibleFraction(sun, SUN_RADIUS_DEG, lift) >= 0.5,
    earthInView: visibleFraction(earth, EARTH_RADIUS_DEG, lift) >= 0.5,
  };
}

const dayLabel = (day: number) =>
  `Day ${(((day % LUNAR_DAY_D) + LUNAR_DAY_D) % LUNAR_DAY_D).toFixed(1)} of ${LUNAR_DAY_D.toFixed(1)}`;

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

export interface HorizonSceneProps {
  className?: string;
  /** Relieve desplazado en grados: negativo en una cresta, positivo en el fondo de un cráter. */
  lift?: number;
  /** Segundos de animación por día terrestre. */
  secondsPerDay?: number;
  /** Día inicial y fotograma fijo con movimiento reducido. Para reiniciar la escena, cambia su `key`. */
  startDay?: number;
  /** Atenúa el otro cuerpo para centrar la atención. */
  focus?: "sun" | "earth";
  /** Dibuja el bucle que la libración traza con la Tierra. */
  earthTrack?: boolean;
  /** Muestra el día transcurrido dentro del día lunar. */
  dayCounter?: boolean;
  /** Si arranca en marcha; con movimiento reducido siempre arranca quieta. */
  autoPlay?: boolean;
  /** Texto alternativo de la escena. */
  label?: string;
}

export function HorizonScene({
  className,
  lift = 0,
  secondsPerDay = SECONDS_PER_DAY,
  startDay = START_DAY,
  focus,
  earthTrack = false,
  dayCounter = false,
  autoPlay = true,
  label = DEFAULT_LABEL,
}: HorizonSceneProps) {
  const uid = useId().replace(/[^\w-]/g, "");
  const reduceMotion = usePrefersReducedMotion();
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? (autoPlay && !reduceMotion);

  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const sunRef = useRef<SVGGElement>(null);
  const earthRef = useRef<SVGGElement>(null);
  const sunPillRef = useRef<HTMLSpanElement>(null);
  const earthPillRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const dayRef = useRef(startDay);

  const initial = frame(startDay, lift);
  const terrain = useMemo(() => terrainPath(2, lift), [lift]);
  const ridge = useMemo(() => ridgePath(2, lift), [lift]);

  // La animación escribe en el DOM por refs: un render de React por fotograma sería demasiado.
  const paint = useCallback(
    (day: number) => {
      const f = frame(day, lift);
      sunRef.current?.setAttribute("transform", f.sun);
      earthRef.current?.setAttribute("transform", f.earth);
      if (sunPillRef.current) sunPillRef.current.dataset.on = String(f.sunInView);
      if (earthPillRef.current) earthPillRef.current.dataset.on = String(f.earthInView);
      if (counterRef.current) counterRef.current.textContent = dayLabel(day);
    },
    [lift],
  );

  // Al cambiar el relieve con la escena quieta, el estado de Sol y Tierra cambia igual.
  useEffect(() => paint(dayRef.current), [paint]);

  useEffect(() => {
    if (!playing || !inView || typeof requestAnimationFrame !== "function") return;
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      // Tope de 100 ms por fotograma: al volver a una pestaña oculta no hay saltos.
      if (last !== null) dayRef.current += Math.min(now - last, 100) / 1000 / secondsPerDay;
      last = now;
      paint(dayRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, inView, paint, secondsPerDay]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative aspect-[16/10] overflow-hidden rounded-xl border border-surface bg-panel sm:aspect-[3/1] lg:aspect-[4/1]",
        className,
      )}
    >
      <div role="img" aria-label={label} className="absolute inset-0">
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
          {earthTrack && (
            <path
              d={EARTH_TRACK}
              fill="none"
              strokeWidth="1.5"
              strokeDasharray="3 6"
              className="stroke-earth/70"
            />
          )}
          <g
            ref={sunRef}
            transform={initial.sun}
            className={cn("transition-opacity duration-500", focus === "earth" && "opacity-20")}
          >
            <circle r="48" fill={`url(#${uid}-sun-glow)`} />
            <circle r={SUN_RADIUS_DEG * SCENE.pxPerDeg} className="fill-sun" />
          </g>
          <g
            ref={earthRef}
            transform={initial.earth}
            className={cn("transition-opacity duration-500", focus === "sun" && "opacity-20")}
          >
            <circle r={EARTH_RADIUS_DEG * SCENE.pxPerDeg * 1.6} fill={`url(#${uid}-earth-glow)`} />
            <circle r={EARTH_RADIUS_DEG * SCENE.pxPerDeg} className="fill-earth" />
          </g>
          <path
            d={terrain}
            fill={`url(#${uid}-ground)`}
            className="motion-safe:transition-[d] motion-safe:duration-700"
          />
          <path
            d={ridge}
            fill="none"
            strokeWidth="1.5"
            className="stroke-muted/50 motion-safe:transition-[d] motion-safe:duration-700"
          />
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
        <div aria-hidden="true" className="absolute top-3 left-3 flex flex-wrap gap-2 pr-12">
          <StatusPill ref={sunPillRef} inView={initial.sunInView} label="Sun" dot="bg-sun" />
          <StatusPill
            ref={earthPillRef}
            inView={initial.earthInView}
            label="Earth"
            dot="bg-earth"
          />
          {dayCounter && (
            <span
              ref={counterRef}
              className="inline-flex items-center rounded-full border border-surface bg-space/80 px-3 py-1 font-mono text-xs text-text"
            >
              {dayLabel(startDay)}
            </span>
          )}
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
