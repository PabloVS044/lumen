/**
 * Ruta /validation — Owner: Producto/Diseño + Efemérides/Ciencia (ver docs/team/ROLES.md). Sección 12.1, HU-13.
 * Las cifras salen del motor (ValidationService.GetReport); el método, las diferencias y los pendientes
 * resumen docs/validation.md (estado del 2026-11-15). Actualizar METHOD y PENDING cuando R2/R3 añadan
 * pruebas: las del informe aparecen solas en la tabla, pero estos textos no.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { pageMetadata } from "@/lib/seo";

import { ValidationReport } from "./validation-report";

export const metadata: Metadata = pageMetadata({
  title: "Validation",
  description:
    "How LUMEN's Sun and Earth positions, eclipse times and sunlight compare with JPL Horizons, NAIF SPICE and NASA PGDA.",
  path: "/validation",
});

const METHOD = [
  {
    title: "Sun and Earth positions",
    body: "Five sites, from the south pole to the far side, at 20 random times between 2026 and 2028: 400 comparisons with the JPL Horizons API. Both sides use the same observer, 2 m above a sphere of radius 1 737.4 km, with no atmosphere. Azimuth error is measured as an arc on the sky (Δaz × cos el), so it does not grow near the zenith.",
  },
  {
    title: "Eclipse times",
    body: "Start and end of the partial and total phases of the eclipse of 3 March 2026, when Earth covers the Sun as seen from the Moon, compared with CSPICE occult() at 1-minute resolution.",
  },
  {
    title: "Sunlight at Connecting ridge",
    body: "NASA's PGDA publishes seven regions near Connecting ridge that are lit more than 70 % of the time from 2024 to 2025, 1 m above the ground (Barker et al. 2021). The engine computes sunlight at the same points, height and period over its own horizon from LOLA terrain: all seven pass, between 74.4 % and 84.7 %.",
  },
  {
    title: "Terrain horizon",
    body: "Engine tests build synthetic terrain: on flat ground the horizon matches the analytic dip within 0.0001°, and a 100 m hill 2 km to the east is found at the right bearing and distance. On real LOLA terrain at Connecting ridge, halving the ray step moved the horizon by at most 0.041°, and extending the reach from 200 to 250 km changed nothing.",
  },
  {
    title: "Repeatable",
    body: "The Horizons and SPICE answers are stored with the engine's tests, so every engine change is checked again without network access. The checks on real terrain need the 5 m LOLA model and run on a local copy.",
  },
] as const;

const DIFFERENCES = [
  "Horizons uses the DE441 ephemeris and the engine uses DE440. They agree closely for present-day dates.",
  "Horizons also corrects for the bending of light by gravity. The engine corrects for light travel time and aberration only, which is the likely source of the small remaining Earth error.",
  "For eclipses, SPICE models Earth as an ellipsoid and the engine as a sphere of radius 6 371 km. Neither models sunlight bent through Earth's atmosphere.",
] as const;

const PENDING = [
  "Sunlight is not yet compared value by value with the tables in Mazarico et al. (2011) and Barker et al. (2021), which are behind a paywall. PGDA publishes a threshold, more than 70 %, not a value for each region.",
  "Sunlight is checked only at Connecting ridge. PGDA publishes regions for other sites too, but their 5 m terrain models are not downloaded yet.",
  "Earth visibility over real terrain is not compared with an independent source yet.",
  "The computed horizon has not been compared by eye with LROC QuickMap or NASA Moon Trek yet.",
  "Catalog coordinates are approximate and still being checked. They do not affect the checks above, which use their own points.",
] as const;

function ValidationSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-4">
      <h2 id={`${id}-title`} className="text-xl font-semibold text-text">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Page() {
  return (
    <PageShell title="Validation">
      <div className="flex max-w-3xl flex-col gap-14 pb-10 text-muted">
        <p className="text-lg">
          Every figure in LUMEN comes from our engine. These checks compare the engine with
          independent references. The results are read from the engine&apos;s validation report, so
          they update whenever the engine changes.
        </p>

        <ValidationSection id="results" title="Results">
          <ValidationReport />
        </ValidationSection>

        <ValidationSection id="method" title="How the checks run">
          <ul className="flex flex-col gap-4">
            {METHOD.map((m) => (
              <li key={m.title}>
                <span className="font-semibold text-text">{m.title}.</span> {m.body}
              </li>
            ))}
          </ul>
        </ValidationSection>

        <ValidationSection id="differences" title="Known differences from the references">
          <ul className="flex list-disc flex-col gap-3 pl-5 marker:text-surface">
            {DIFFERENCES.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </ValidationSection>

        <ValidationSection id="pending" title="What is not validated yet">
          <ul className="flex list-disc flex-col gap-3 pl-5 marker:text-surface">
            {PENDING.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </ValidationSection>
      </div>
    </PageShell>
  );
}
