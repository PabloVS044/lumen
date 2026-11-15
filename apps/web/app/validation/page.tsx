/**
 * Ruta /validation — Owner: Producto/Diseño + Efemérides/Ciencia (ver docs/team/ROLES.md). Sección 12.1, HU-13.
 * Las cifras salen del motor (ValidationService.GetReport); el método, las diferencias y los pendientes
 * resumen docs/validation.md. Actualizar "What is not validated yet" cuando R2/R3 añadan pruebas.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";

import { ValidationReport } from "./validation-report";

export const metadata: Metadata = {
  title: "Validation",
  description:
    "How LUMEN's Sun and Earth positions and eclipse times compare with JPL Horizons and NAIF SPICE.",
};

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
    title: "Repeatable",
    body: "The reference answers are stored with the engine's tests, so every change to the engine is checked again, without network access.",
  },
] as const;

const DIFFERENCES = [
  "Horizons uses the DE441 ephemeris and the engine uses DE440. They agree closely for present-day dates.",
  "Horizons also corrects for the bending of light by gravity. The engine corrects for light travel time and aberration only, which is the likely source of the small remaining Earth error.",
  "For eclipses, SPICE models Earth as an ellipsoid and the engine as a sphere of radius 6 371 km. Neither models sunlight bent through Earth's atmosphere.",
] as const;

const PENDING = [
  "These checks cover where the Sun and Earth are in the sky. They do not test the terrain horizon or the sunlight and contact figures built on it.",
  "Horizon tests on synthetic terrain are in progress: flat ground, an analytic mountain, and finer ray steps with a longer reach.",
  "Sunlight percentages will be compared with published LOLA illumination maps (Mazarico et al. 2011, Barker et al. 2021). Differences will be listed here with their causes, such as the period, the observer height or the terrain resolution.",
  "Catalog coordinates are approximate and still being checked. This does not affect the checks above, because the engine and the references use the same coordinates.",
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
