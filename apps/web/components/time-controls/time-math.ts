/**
 * Aritmética de tiempo de TimeControls (sección 12.2). Owner: Frontend 3D.
 * Todo en milisegundos UTC; las fechas ISO solo en los bordes.
 */
export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;
const DEFAULT_WINDOW_DAYS = 30;

/** Fecha ISO como UTC. Sin zona ("2027-01-15T06:00") se interpreta como UTC, no como hora local. */
export function parseUtc(s: string | null | undefined): number | null {
  if (!s) return null;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
  const ms = Date.parse(hasZone ? s : `${s}Z`);
  return Number.isNaN(ms) ? null : ms;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface WindowInput {
  start: string | null;
  end: string | null;
  t: string | null;
}

/** Ventana del slider: `start`/`end` de la URL; si faltan, desde `t` (o la hora actual) y 30 días. */
export function resolveWindow({ start, end, t }: WindowInput, nowHourMs: number) {
  const startMs = parseUtc(start) ?? parseUtc(t) ?? nowHourMs;
  const parsedEnd = parseUtc(end);
  const endMs =
    parsedEnd !== null && parsedEnd > startMs ? parsedEnd : startMs + DEFAULT_WINDOW_DAYS * DAY_MS;
  return { startMs, endMs };
}

/** Avanza `dtMs` reales a `speedHoursPerSecond`, sin pasar del final de la ventana. */
export function advance(
  currentMs: number,
  dtMs: number,
  speedHoursPerSecond: number,
  endMs: number,
) {
  return Math.min(endMs, currentMs + (dtMs / 1000) * speedHoursPerSecond * HOUR_MS);
}

interface TimedEvent {
  type: number;
  time?: { seconds: bigint; nanos?: number };
}

export const eventMs = (e: TimedEvent) =>
  e.time ? Number(e.time.seconds) * 1000 + (e.time.nanos ?? 0) / 1e6 : NaN;

/** De la lista que ya llegó del motor, el primer evento estrictamente posterior a `currentMs`. */
export function nextEvent<T extends TimedEvent>(events: T[], currentMs: number): T | undefined {
  return events.filter((e) => eventMs(e) > currentMs).sort((a, b) => eventMs(a) - eventMs(b))[0];
}

/** Atajos de teclado del control de tiempo (sección 12.5). */
export function keyAction(key: string) {
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return { deltaMs: HOUR_MS };
    case "ArrowLeft":
    case "ArrowDown":
      return { deltaMs: -HOUR_MS };
    case "PageUp":
      return { deltaMs: DAY_MS };
    case "PageDown":
      return { deltaMs: -DAY_MS };
    case "Home":
      return { to: "start" as const };
    case "End":
      return { to: "end" as const };
    case " ":
      return { toggle: true as const };
    default:
      return null;
  }
}

export const toUtcInput = (ms: number) => new Date(ms).toISOString().slice(0, 16);
export const fromUtcInput = (s: string) => parseUtc(s);
