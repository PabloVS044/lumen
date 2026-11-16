/**
 * Ruta /about — Owner: Producto/Diseño (ver docs/team/ROLES.md). Sección 12.1.
 * Metodología resumida, convenciones, atribuciones (8.5), equipo, uso de IA e independencia.
 * Fuentes y enlaces: solo los de las secciones 8 y 20 del documento técnico.
 * ⚠️ VERIFICAR la declaración de IA y el aviso contra la Participant Guide 2026 (sección 3.2).
 */
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: "How LUMEN computes sunlight and Earth visibility, its data sources and the team.",
  path: "/about",
});

const PIPELINE = [
  {
    step: "Terrain",
    body: "Elevation around the site is read from LOLA digital elevation models, finest grid first.",
  },
  {
    step: "Horizon mask",
    body: "For every azimuth, rays run out across the terrain and keep the highest elevation angle, with the drop caused by the Moon's curvature.",
  },
  {
    step: "Sun and Earth",
    body: "Azimuth and elevation of both bodies come from NAIF SPICE kernels (DE440) in the MOON_ME frame.",
  },
  {
    step: "Visibility",
    body: "Each disc is compared with the horizon to get the visible fraction; times when Earth covers the Sun are removed.",
  },
  {
    step: "Metrics and events",
    body: "Hours of light and contact, the longest dark spells, and the times of sunrise, sunset, Earthrise and Earthset.",
  },
] as const;

const CONVENTIONS = [
  { term: "Time", value: "UTC, ISO 8601" },
  { term: "Azimuth", value: "Degrees from north, clockwise" },
  { term: "Longitude", value: "East positive, −180° to 180° (0° to 360° accepted)" },
  { term: "Latitude", value: "South negative" },
  { term: "Body frame", value: "MOON_ME, mean lunar radius 1 737.4 km" },
  { term: "Observer height", value: "2 m above the terrain by default" },
] as const;

const SOURCES = [
  {
    name: "LOLA South Pole DEMs (NASA Goddard PGDA)",
    use: "5 m per pixel terrain near the south pole",
    href: "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/",
  },
  {
    name: "LOLA PDS archive (MIT)",
    use: "Polar and global elevation models for the distant horizon",
    href: "https://imbrium.mit.edu/",
  },
  {
    name: "NAIF SPICE generic kernels (NASA JPL)",
    use: "DE440 ephemeris, lunar frames and leap seconds",
    href: "https://naif.jpl.nasa.gov/pub/naif/generic_kernels/",
  },
  {
    name: "JPL Horizons System",
    use: "Independent check of Sun and Earth positions",
    href: "https://ssd.jpl.nasa.gov/horizons/",
  },
  {
    name: "Cesium Moon (Cesium ion)",
    use: "3D Moon terrain on the globe, built from LRO data",
    href: "https://cesium.com/platform/cesium-ion/content/cesium-moon/",
  },
  {
    name: "NASA, Artemis III landing regions update",
    use: "Candidate landing regions in the site catalog",
    href: "https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/",
  },
  {
    name: "LROC QuickMap (Arizona State University)",
    use: "Reference for checking site coordinates",
    href: "https://quickmap.lroc.asu.edu/",
  },
  {
    name: "NASA Moon Trek",
    use: "Reference for the 3D globe",
    href: "https://trek.nasa.gov/moon/",
  },
  {
    name: "Canadian Space Agency, Moon exploration",
    use: "Context on lunar exploration for the Learn section",
    href: "https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/",
  },
] as const;

const PAPERS = [
  {
    cite: "Mazarico, E., et al. (2011). Illumination conditions of the lunar polar regions using LOLA topography. Icarus, 211(2), 1066–1081.",
    href: "https://doi.org/10.1016/j.icarus.2010.10.030",
  },
  {
    cite: "Barker, M. K., et al. (2021). Improved LOLA elevation maps for south pole landing sites: Error estimates and their impact on illumination conditions. Planetary and Space Science.",
    href: "https://doi.org/10.1016/j.pss.2020.105119",
  },
  {
    cite: "Park, R. S., et al. (2021). The JPL Planetary and Lunar Ephemerides DE440 and DE441. The Astronomical Journal, 161(3), 105.",
  },
] as const;

// Mismo reparto que docs/team/ROLES.md; actualizar ambos a la vez.
const TEAM = [
  { role: "Backend and infrastructure", handle: "bcastillo-2022474" },
  { role: "Terrain and data", handle: "carlosaltan18" },
  { role: "Ephemerides and science", handle: "PabloVS044" },
  { role: "3D globe", handle: "asanabria-2021067" },
  { role: "Charts and UX", handle: "JonathanTubac" },
  { role: "Product, design and pitch", handle: "24750Montenegro" },
] as const;

const linkClass = "text-text underline decoration-muted underline-offset-4 hover:decoration-text";

function AboutSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-4 scroll-mt-6">
      <h2 id={`${id}-title`} className="text-xl font-semibold text-text">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Page() {
  return (
    <PageShell title="About LUMEN">
      <div className="flex max-w-3xl flex-col gap-14 pb-10 text-muted">
        <p className="text-lg">
          LUMEN is a web tool built for the NASA Space Apps Challenge 2026 challenge Lunar Landing
          Site Navigator. For any lunar coordinate and date range it works out when the Sun and
          Earth stand above the real terrain horizon, so mission planners, educators and the public
          can compare landing sites and dates quickly.
        </p>

        <AboutSection id="method" title="Method">
          <ol className="flex flex-col gap-4">
            {PIPELINE.map((p, i) => (
              <li key={p.step} className="grid grid-cols-[2.5rem_1fr] gap-x-2">
                <span className="font-mono text-earth">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-semibold text-text">{p.step}.</span> {p.body}
                </span>
              </li>
            ))}
          </ol>
          <p>
            Sun and Earth positions are compared with JPL Horizons, with a target error of 0.01° or
            less. The{" "}
            <Link href="/validation" className={linkClass}>
              Validation
            </Link>{" "}
            page tracks this check.
          </p>
        </AboutSection>

        <AboutSection id="conventions" title="Units and conventions">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
            {CONVENTIONS.map((c) => (
              <div key={c.term} className="contents">
                <dt className="font-semibold text-text">{c.term}</dt>
                <dd className="font-mono text-sm leading-6">{c.value}</dd>
              </div>
            ))}
          </dl>
        </AboutSection>

        <AboutSection id="credits" title="Data and credits">
          <p>
            NASA, JPL and PDS data are credited here as their providers ask. Cesium Moon is used
            under the Cesium ion terms, with its credits shown in the 3D viewer.
          </p>
          <ul className="flex flex-col gap-3">
            {SOURCES.map((s) => (
              <li key={s.href} className="flex flex-col">
                <a href={s.href} className={linkClass}>
                  {s.name}
                </a>
                <span className="text-sm">{s.use}</span>
              </li>
            ))}
          </ul>
          <h3 className="pt-2 font-semibold text-text">References</h3>
          <ul className="flex flex-col gap-3 text-sm">
            {PAPERS.map((p) => (
              <li key={p.cite}>
                {p.cite}{" "}
                {"href" in p && (
                  <a href={p.href} className={linkClass}>
                    {p.href.replace("https://doi.org/", "doi:")}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </AboutSection>

        <AboutSection id="team" title="Team">
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {TEAM.map((m) => (
              <li key={m.handle} className="flex flex-col">
                <span className="font-semibold text-text">{m.role}</span>
                <a href={`https://github.com/${m.handle}`} className={`${linkClass} text-sm`}>
                  @{m.handle}
                </a>
              </li>
            ))}
          </ul>
        </AboutSection>

        <AboutSection id="ai" title="Use of AI">
          <p>
            We use AI coding assistants, including Claude Code, to help write and review code, tests
            and documentation. Every change goes through a pull request reviewed by a team member.
            Figures shown in LUMEN come from our engine or from the sources cited above. LUMEN uses
            no AI-generated images and no NASA logo or insignia.
          </p>
        </AboutSection>

        <AboutSection id="independence" title="Independence">
          <p>
            LUMEN is an independent team project. It is not affiliated with or endorsed by NASA, the
            Canadian Space Agency or any other organization named on this site.
          </p>
        </AboutSection>
      </div>
    </PageShell>
  );
}
