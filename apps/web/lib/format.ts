/**
 * Formato de cifras y fechas para la UI. Owner: Frontend Charts/UX (docs/team/ROLES.md).
 * Fechas siempre en UTC (sección 0).
 */

/** "2027-01-15 06:00 UTC". */
export const formatUtc = (ms: number) =>
  `${new Date(ms).toISOString().slice(0, 16).replace("T", " ")} UTC`;

/** "1.2°" / "−2.38°" (signo menos tipográfico, también para −0.0). */
export function formatDeg(deg: number, digits = 1): string {
  const s = Math.abs(deg).toFixed(digits);
  return `${deg < 0 || Object.is(deg, -0) ? "−" : ""}${s}°`;
}

/** "4 d 6 h", "18 h", "35 min". Redondea a la unidad más pequeña mostrada. */
export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const total = Math.round(hours);
  const d = Math.floor(total / 24);
  const h = total % 24;
  if (d === 0) return `${h} h`;
  return h === 0 ? `${d} d` : `${d} d ${h} h`;
}

/** "Jan 05" en UTC. */
export const formatDay = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" });
