/**
 * "Tiempo a sunset/Earthset desde t*" (sección 9.6, HU-06). Owner: Frontend Charts.
 * Visible en t* → próximo ocaso; oculto → próxima salida. Sin evento en el rango → atMs = null.
 */
import { EventType } from "@lumen/sdk";

export type Body = "sun" | "earth";

const SET: Record<Body, EventType> = { sun: EventType.SUNSET, earth: EventType.EARTHSET };
const RISE: Record<Body, EventType> = { sun: EventType.SUNRISE, earth: EventType.EARTHRISE };

export function nextChange(
  events: { type: EventType; ms: number }[],
  body: Body,
  visibleNow: boolean,
  currentMs: number,
): { kind: "set" | "rise"; atMs: number | null } {
  const kind = visibleNow ? "set" : "rise";
  const want = visibleNow ? SET[body] : RISE[body];
  let atMs: number | null = null;
  for (const e of events) {
    if (e.type === want && e.ms > currentMs && (atMs === null || e.ms < atMs)) atMs = e.ms;
  }
  return { kind, atMs };
}
