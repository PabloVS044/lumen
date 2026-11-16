"use client";

/**
 * SitePicker — M1 Selector de sitio. Owner: Frontend Charts (ver docs/team/ROLES.md).
 * Especificación: sección 12.2 y HU-01. Catálogo (combobox con filtros), coordenadas libres en decimal o
 * DMS, enlace para elegir en el globo y lista de sitios activos (máx. 4) con su color.
 * Sin `onSelect`, lo elegido se agrega a la comparación (store); con `onSelect`, decide quien lo usa.
 */
import { useQuery } from "@connectrpc/connect-query";
import { Region, SiteService, SiteStatus, type CatalogSite } from "@lumen/sdk";
import { X } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";

import { formatLatLon, parseLatitude, parseLongitude } from "@/lib/coords";
import { cn } from "@/lib/utils";
import { MAX_SITES, useScenarioStore } from "@/stores/scenario-store";

import {
  distinct,
  filterSites,
  nextSiteColor,
  siteHref,
  STATUS_LABELS,
  type PickedSite,
  type SiteFilters,
} from "./site-picker-model";

export type { PickedSite } from "./site-picker-model";

const OBS_HEIGHT_M = 2;

const control =
  "min-h-11 rounded-md border border-surface bg-space px-3 text-sm text-text placeholder:text-muted";

const REGION_LABELS: Record<Region, string> = {
  [Region.UNSPECIFIED]: "Unknown",
  [Region.SOUTH_POLE]: "South pole",
  [Region.NORTH_POLE]: "North pole",
  [Region.NEARSIDE]: "Nearside",
  [Region.FARSIDE]: "Farside",
};

export interface SitePickerProps {
  onSelect?: (site: PickedSite) => void;
  /** Muestra el enlace "Choose on the globe" (HU-01 AC3); no tiene sentido dentro de /explore. */
  mapLink?: boolean;
}

export function SitePicker({ onSelect, mapLink = false }: SitePickerProps) {
  const sites = useScenarioStore((s) => s.sites);
  const [notice, setNotice] = useState("");

  const pick = (site: PickedSite) => {
    if (onSelect) return onSelect(site);
    const same = (s: { id?: string; lat: number; lon: number }) =>
      site.id ? s.id === site.id : s.lat === site.lat && s.lon === site.lon;
    if (sites.some(same)) return setNotice(`${site.name} is already in the comparison.`);
    const color = nextSiteColor(sites);
    if (!color)
      return setNotice(`The comparison holds up to ${MAX_SITES} sites. Remove one first.`);
    useScenarioStore.getState().addSite({ ...site, obsHeightM: OBS_HEIGHT_M, color });
    setNotice(`${site.name} added to the comparison.`);
  };

  return (
    <section aria-label="Site picker" className="flex flex-col gap-6 text-sm">
      <CatalogSearch onPick={pick} />
      <CoordinateForm onPick={pick} />
      {mapLink && (
        <p className="text-muted">
          Or{" "}
          <Link href="/explore" className="text-earth underline underline-offset-4">
            choose a point on the globe
          </Link>
          .
        </p>
      )}
      <p role="status" className="text-muted empty:hidden">
        {notice}
      </p>
      <ActiveSites />
    </section>
  );
}

function CatalogSearch({ onPick }: { onPick: (site: PickedSite) => void }) {
  const ids = useId();
  const listId = `${ids}-list`;
  const { data, error, isPending } = useQuery(SiteService.method.listSites, {
    region: Region.UNSPECIFIED,
  });
  const catalog = useMemo(() => data?.sites ?? [], [data]);

  const [filters, setFilters] = useState<SiteFilters>({});
  const [region, setRegion] = useState<Region | undefined>();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = useMemo(
    () => filterSites(catalog, filters).filter((s) => region === undefined || s.region === region),
    [catalog, filters, region],
  );

  const choose = (s: CatalogSite) => {
    onPick({ id: s.id, name: s.name, lat: s.lat, lon: s.lon });
    setFilters((f) => ({ ...f, query: "" }));
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (matches.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      // Sin opción activa, ↓ va a la primera y ↑ a la última.
      setActive((i) =>
        i < 0 ? (step > 0 ? 0 : matches.length - 1) : (i + step + matches.length) % matches.length,
      );
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      choose(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const programs = distinct(catalog.map((s) => s.program));
  const countries = distinct(catalog.map((s) => s.country));
  const statuses = [...new Set(catalog.map((s) => s.status))].sort();
  const regions = [...new Set(catalog.map((s) => s.region))].sort();
  const query = filters.query ?? "";
  const optionId = (i: number) => `${ids}-opt-${i}`;

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={`${ids}-q`} className="font-medium text-text">
        Search the catalog
      </label>
      <div className="relative">
        <input
          id={`${ids}-q`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          placeholder="Site name, e.g. Malapert"
          className={cn(control, "w-full")}
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setFilters((f) => ({ ...f, query: e.target.value }));
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Catalog sites"
            className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-surface bg-panel py-1 shadow-lg"
          >
            {isPending && <li className="px-3 py-2 text-muted">Loading catalog…</li>}
            {error && <li className="px-3 py-2 text-bad">{error.message}</li>}
            {!isPending && !error && matches.length === 0 && (
              <li className="px-3 py-2 text-muted">
                {query
                  ? `No catalog site matches “${query}”.`
                  : "No catalog site matches these filters."}
              </li>
            )}
            {matches.map((s, i) => (
              <li
                key={s.id}
                id={optionId(i)}
                role="option"
                aria-selected={i === active}
                className={cn(
                  "flex cursor-pointer flex-col gap-0.5 px-3 py-2",
                  i === active ? "bg-surface" : "hover:bg-surface",
                )}
                // Evita el blur del input antes del clic.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(s)}
              >
                <span className="text-text">{s.name}</span>
                <span className="font-mono text-xs text-muted">
                  {formatLatLon(s.lat, s.lon, 2)}
                  {s.program && <span className="font-sans"> · {s.program}</span>}
                  {!s.verified && <span className="font-sans text-partial"> · unverified</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {regions.length > 1 && (
          <FilterSelect
            label="Region"
            value={region === undefined ? "" : String(region)}
            options={regions.map((r) => [String(r), REGION_LABELS[r]])}
            onChange={(v) => setRegion(v ? (Number(v) as Region) : undefined)}
          />
        )}
        {programs.length > 1 && (
          <FilterSelect
            label="Program"
            value={filters.program ?? ""}
            options={programs.map((p) => [p, p])}
            onChange={(v) => setFilters((f) => ({ ...f, program: v || undefined }))}
          />
        )}
        {countries.length > 1 && (
          <FilterSelect
            label="Country"
            value={filters.country ?? ""}
            options={countries.map((c) => [c, c])}
            onChange={(v) => setFilters((f) => ({ ...f, country: v || undefined }))}
          />
        )}
        {statuses.length > 1 && (
          <FilterSelect
            label="Status"
            value={filters.status ? String(filters.status) : ""}
            options={statuses.map((s) => [String(s), STATUS_LABELS[s]])}
            onChange={(v) =>
              setFilters((f) => ({ ...f, status: v ? (Number(v) as SiteStatus) : undefined }))
            }
          />
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [value: string, label: string][];
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted">
        {label}
      </label>
      <select id={id} className={control} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function CoordinateForm({ onPick }: { onPick: (site: PickedSite) => void }) {
  const id = useId();
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [errors, setErrors] = useState<{ lat?: string; lon?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const pLat = parseLatitude(lat);
    const pLon = parseLongitude(lon);
    setErrors({ lat: pLat.ok ? undefined : pLat.error, lon: pLon.ok ? undefined : pLon.error });
    if (pLat.ok && pLon.ok) onPick({ name: "Custom point", lat: pLat.value, lon: pLon.value });
  };

  const field = (
    key: "lat" | "lon",
    label: string,
    value: string,
    set: (v: string) => void,
    placeholder: string,
  ) => (
    <div className="flex min-w-40 flex-1 flex-col gap-1">
      <label htmlFor={`${id}-${key}`} className="text-xs text-muted">
        {label}
      </label>
      <input
        id={`${id}-${key}`}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        className={cn(control, "font-mono", errors[key] && "border-bad")}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `${id}-${key}-err` : `${id}-hint`}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setErrors((er) => ({ ...er, [key]: undefined }));
        }}
      />
      {errors[key] && (
        <p id={`${id}-${key}-err`} className="text-bad">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={submit}
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-3"
    >
      <h3 id={`${id}-title`} className="font-medium text-text">
        Or enter coordinates
      </h3>
      <p id={`${id}-hint`} className="text-muted">
        Decimal degrees or degrees and minutes. South and west are negative; longitude also accepts
        0–360° east.
      </p>
      <div className="flex flex-wrap items-start gap-3">
        {field("lat", "Latitude", lat, setLat, "-89.45 or 89°27'S")}
        {field("lon", "Longitude", lon, setLon, "-137.31 or 222°41'E")}
      </div>
      <button
        type="submit"
        className="min-h-11 self-start rounded-md border border-surface px-4 hover:bg-surface"
      >
        Use these coordinates
      </button>
    </form>
  );
}

function ActiveSites() {
  const sites = useScenarioStore((s) => s.sites);
  if (sites.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-medium text-text">
        Sites to compare ({sites.length}/{MAX_SITES})
      </h3>
      <ul aria-label="Active sites" className="flex flex-col gap-1">
        {sites.map((s, i) => (
          <li key={`${s.id ?? "point"}-${s.lat}-${s.lon}`} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <Link href={siteHref(s)} className="flex-1 hover:underline">
              {s.name}{" "}
              <span className="font-mono text-xs text-muted">{formatLatLon(s.lat, s.lon, 2)}</span>
            </Link>
            <button
              type="button"
              aria-label={`Remove ${s.name}`}
              className="inline-flex size-11 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-text"
              onClick={() => useScenarioStore.getState().removeSite(i)}
            >
              <X aria-hidden className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
