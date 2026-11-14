"use client";

/**
 * SitePicker — M1 Selector de sitio. Owner: Frontend Charts (ver docs/team/ROLES.md).
 * Especificación: sección 12.2. Patrón de datos: connect-query + descriptores de @lumen/sdk.
 */
import { useQuery } from "@connectrpc/connect-query";
import { Region, SiteService } from "@lumen/sdk";

export function SitePicker() {
  const { data, error, isPending } = useQuery(SiteService.method.listSites, {
    region: Region.SOUTH_POLE,
  });

  return (
    <section aria-label="Site picker" className="rounded-lg border border-surface p-4 text-sm">
      <h2 className="mb-2 font-medium">Sites</h2>
      {isPending && <p className="text-muted">Loading catalog…</p>}
      {error && <p className="text-bad">{error.message}</p>}
      <ul className="flex flex-col gap-1">
        {data?.sites.map((s) => (
          <li key={s.id} className="flex justify-between gap-4">
            <span>{s.name}</span>
            <span className="font-mono text-muted">
              {s.lat.toFixed(2)}, {s.lon.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
