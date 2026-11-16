/**
 * Lógica pura de SitePicker (M1). Owner: Frontend Charts/UX (ver docs/team/ROLES.md).
 */
import { SiteStatus, type CatalogSite } from "@lumen/sdk";

/** Punto elegido: un sitio del catálogo (con id) o coordenadas libres. Lon en [-180, 180). */
export interface PickedSite {
  id?: string;
  name: string;
  lat: number;
  lon: number;
}

export interface SiteFilters {
  query?: string;
  program?: string;
  country?: string;
  status?: SiteStatus;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function filterSites(sites: CatalogSite[], f: SiteFilters): CatalogSite[] {
  const q = fold(f.query?.trim() ?? "");
  return sites.filter(
    (s) =>
      (!q || fold(s.name).includes(q) || fold(s.id).includes(q)) &&
      (!f.program || s.program === f.program) &&
      (!f.country || s.country === f.country) &&
      (!f.status || s.status === f.status),
  );
}

/** Valores distintos y no vacíos, ordenados (para los filtros). */
export const distinct = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));

export const STATUS_LABELS: Record<SiteStatus, string> = {
  [SiteStatus.UNSPECIFIED]: "Unknown",
  [SiteStatus.CANDIDATE]: "Candidate",
  [SiteStatus.LANDED]: "Landed",
  [SiteStatus.PLANNED]: "Planned",
  [SiteStatus.HISTORIC]: "Historic",
};

/**
 * Colores de los sitios activos (máx. 4): tokens `--color-site-1..4` de globals.css. Mismo formato de
 * cadena que usa /explore, para que ambas vistas compartan la lista del store.
 */
export const SITE_COLORS = [
  "var(--color-site-1)",
  "var(--color-site-2)",
  "var(--color-site-3)",
  "var(--color-site-4)",
] as const;

export function nextSiteColor(active: { color: string }[]): string | undefined {
  const used = new Set(active.map((s) => s.color));
  return SITE_COLORS.find((c) => !used.has(c));
}

export const siteHref = (s: { lat: number; lon: number }) => `/site?lat=${s.lat}&lon=${s.lon}`;
