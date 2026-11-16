/**
 * Parsers de estado en URL con nuqs (sección 12.3). Archivo compartido (docs/team/ROLES.md).
 * Ejemplo: /site?lat=-89.45&lon=-137.31&h=2&start=2027-01-01&end=2027-03-01&step=30&t=...&tab=horizon
 */
import {
  createParser,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs";

import { decodePower, decodeWhatIf, encodePower, encodeWhatIf } from "./share-codec";

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

/** Escenarios compartibles (M13): presentes en la URL ⇒ el enlace reproduce el resultado. */
export const powerParser = createParser({ parse: decodePower, serialize: encodePower });
export const whatIfParser = createParser({ parse: decodeWhatIf, serialize: encodeWhatIf });

/** Escrituras de estado que no deben llenar el historial del navegador. */
export const replaceUrl = { history: "replace" as const, shallow: true };
