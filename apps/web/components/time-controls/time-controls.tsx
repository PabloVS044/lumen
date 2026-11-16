"use client";

/**
 * TimeControls — reloj único de la app (sección 12.2). Owner: Frontend 3D (docs/team/ROLES.md).
 * Escribe `currentTime`, `playing` y `speedHoursPerSecond` en el store; todas las vistas leen de ahí.
 * `t` en la URL solo se actualiza al pausar o soltar el control, nunca durante la reproducción.
 */
import { useQuery } from "@connectrpc/connect-query";
import { EphemerisService, EventType } from "@lumen/sdk";
import { skipToken } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { siteSearchParams } from "@/lib/url-state";
import { useScenarioStore } from "@/stores/scenario-store";

import {
  DAY_MS,
  HOUR_MS,
  advance,
  clamp,
  eventMs,
  fromUtcInput,
  keyAction,
  nextEvent,
  parseUtc,
  resolveWindow,
  toUtcInput,
} from "./time-math";

const SPEEDS = [1, 6, 24, 72];
const WRITE_INTERVAL_MS = 100;
const EVENT_TYPES = [EventType.SUNRISE, EventType.SUNSET, EventType.EARTHRISE, EventType.EARTHSET];
const EVENT_LABEL: Record<number, string> = {
  [EventType.SUNRISE]: "sunrise",
  [EventType.SUNSET]: "sunset",
  [EventType.EARTHRISE]: "earthrise",
  [EventType.EARTHSET]: "earthset",
};

const urlOptions = { history: "replace" as const, shallow: true };
const noopSubscribe = () => () => {};
// "Ahora" como store externo: en el prerender (Cache Components) no se llama a Date.now().
const nowHour = () => Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
const iso = (ms: number) => new Date(ms).toISOString();
const label = (ms: number) => `${iso(ms).slice(0, 16).replace("T", " ")} UTC`;

interface SiteRef {
  lat: number;
  lon: number;
  obsHeightM?: number;
}

export function TimeControls({ site }: { site?: SiteRef }) {
  return (
    <Suspense
      fallback={
        <section
          aria-label="Time controls"
          className="rounded-lg border border-surface p-3 text-sm text-muted"
        >
          Loading time controls…
        </section>
      }
    >
      <Controls site={site} />
    </Suspense>
  );
}

function Controls({ site }: { site?: SiteRef }) {
  const [t, setT] = useQueryState("t", siteSearchParams.t.withOptions(urlOptions));
  const [start] = useQueryState("start", siteSearchParams.start);
  const [end] = useQueryState("end", siteSearchParams.end);
  const now = useSyncExternalStore(noopSubscribe, nowHour, () => null);

  const currentTime = useScenarioStore((s) => s.currentTime);
  const playing = useScenarioStore((s) => s.playing);
  const speed = useScenarioStore((s) => s.speedHoursPerSecond);
  const { setCurrentTime, setPlaying, setSpeed } = useScenarioStore.getState();

  const win = useMemo(
    () => (now === null && !start && !t ? null : resolveWindow({ start, end, t }, now ?? 0)),
    [start, end, t, now],
  );
  const currentMs = currentTime ? parseUtc(currentTime) : null;

  // Hora inicial: `t` de la URL, si no el inicio de la ventana. Nunca arranca solo.
  useEffect(() => {
    if (!win || useScenarioStore.getState().currentTime) return;
    setCurrentTime(iso(clamp(parseUtc(t) ?? win.startMs, win.startMs, win.endMs)));
  }, [win, t, setCurrentTime]);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setSpeed(1);
  }, [setSpeed]);

  const commit = useCallback(() => {
    const cur = useScenarioStore.getState().currentTime;
    if (cur) void setT(cur);
  }, [setT]);

  const setTime = useCallback(
    (ms: number, writeUrl = false) => {
      if (!win) return;
      setCurrentTime(iso(clamp(ms, win.startMs, win.endMs)));
      if (writeUrl) commit();
    },
    [win, setCurrentTime, commit],
  );

  // Reproducción: rAF, pero al store como mucho a ~10 Hz y redondeado al segundo.
  useEffect(() => {
    if (!playing || !win) return;
    let raf = 0;
    let last: number | null = null;
    let lastWrite = -Infinity;
    let pos = parseUtc(useScenarioStore.getState().currentTime) ?? win.startMs;
    const tick = (ts: number) => {
      if (last !== null) {
        pos = advance(pos, ts - last, useScenarioStore.getState().speedHoursPerSecond, win.endMs);
      }
      last = ts;
      const finished = pos >= win.endMs;
      if (finished || ts - lastWrite >= WRITE_INTERVAL_MS) {
        setCurrentTime(iso(Math.round(pos / 1000) * 1000));
        lastWrite = ts;
      }
      if (finished) {
        setPlaying(false);
        commit();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, win, setCurrentTime, setPlaying, commit]);

  const togglePlay = () => {
    if (playing) commit();
    setPlaying(!playing);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const action = keyAction(e.key);
    if (!action || !win || currentMs === null) return;
    e.preventDefault();
    if (action.toggle) togglePlay();
    else if (action.to) setTime(action.to === "start" ? win.startMs : win.endMs, true);
    else setTime(currentMs + action.deltaMs, true);
  };

  const events = useQuery(
    EphemerisService.method.listEvents,
    site && win
      ? {
          site: { lat: site.lat, lon: site.lon, obsHeightM: site.obsHeightM ?? 0 },
          from: { seconds: BigInt(Math.floor(win.startMs / 1000)) },
          types: EVENT_TYPES,
          horizonDays: Math.min(730, Math.ceil((win.endMs - win.startMs) / DAY_MS)),
        }
      : skipToken,
    { staleTime: Infinity },
  );
  const next =
    events.data && currentMs !== null ? nextEvent(events.data.events, currentMs) : undefined;

  const goToNext = () => {
    if (!next) return;
    setPlaying(false);
    setTime(eventMs(next), true);
  };

  if (!win || currentMs === null) {
    return (
      <section
        aria-label="Time controls"
        className="rounded-lg border border-surface p-3 text-sm text-muted"
      >
        Loading time controls…
      </section>
    );
  }

  const btn =
    "rounded-md border border-surface px-3 py-1 hover:bg-surface disabled:opacity-50 disabled:hover:bg-transparent";
  const nextHint = !site
    ? "Select a site to jump to its next event."
    : events.error
      ? "Could not load events."
      : !next && events.data
        ? "No more events in this range."
        : null;

  return (
    <section
      aria-label="Time controls"
      className="flex flex-col gap-3 rounded-lg border border-surface bg-panel p-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btn} aria-pressed={playing} onClick={togglePlay}>
          {playing ? "Pause" : "Play"}
        </button>
        <label className="flex items-center gap-2">
          <span className="text-muted">Speed</span>
          <select
            className="rounded-md border border-surface bg-space px-2 py-1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            {(SPEEDS.includes(speed) ? SPEEDS : [...SPEEDS, speed].sort((a, b) => a - b)).map(
              (s) => (
                <option key={s} value={s}>
                  {s} h/s
                </option>
              ),
            )}
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-muted">Exact date and time (UTC)</span>
          <input
            type="datetime-local"
            className="rounded-md border border-surface bg-space px-2 py-1"
            value={toUtcInput(currentMs)}
            min={toUtcInput(win.startMs)}
            max={toUtcInput(win.endMs)}
            onChange={(e) => {
              const ms = fromUtcInput(e.target.value);
              if (ms !== null) setTime(ms, true);
            }}
          />
        </label>
        <button type="button" className={btn} onClick={goToNext} disabled={!next}>
          {next
            ? `Next event: ${EVENT_LABEL[next.type] ?? "event"} (${label(eventMs(next))})`
            : "Next event"}
        </button>
      </div>
      {nextHint && <p className="text-muted">{nextHint}</p>}
      <input
        type="range"
        aria-label="Time (UTC)"
        aria-valuetext={label(currentMs)}
        className="w-full"
        min={win.startMs}
        max={win.endMs}
        step={HOUR_MS}
        value={currentMs}
        onChange={(e) => setTime(Number(e.target.value))}
        onPointerUp={commit}
        onKeyDown={onKeyDown}
      />
      <output aria-live={playing ? "off" : "polite"} className="font-mono text-muted">
        {label(currentMs)}
      </output>
    </section>
  );
}
