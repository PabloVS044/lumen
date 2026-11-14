/**
 * Parsers de estado en URL con nuqs (sección 12.3). Archivo compartido (docs/team/ROLES.md).
 * Ejemplo: /site?lat=-89.45&lon=-137.31&h=2&start=2027-01-01&end=2027-03-01&step=30&t=...&tab=horizon
 */
import { parseAsFloat, parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

export const siteTabs = ["horizon", "timeline", "metrics", "power", "whatif", "terrain"] as const;

export const siteSearchParams = {
  lat: parseAsFloat,
  lon: parseAsFloat,
  h: parseAsFloat.withDefault(2),
  start: parseAsString,
  end: parseAsString,
  step: parseAsInteger.withDefault(30),
  t: parseAsString,
  tab: parseAsStringLiteral(siteTabs).withDefault("horizon"),
  mode: parseAsStringLiteral(["planner", "explore"] as const).withDefault("planner"),
};
