/**
 * Landing. Owner: Producto/Diseño. Secciones 12.1 (contenido) y 18 (marca, UX).
 * Cifras: solo las de la sección 4 del documento técnico (física de referencia); ninguna sale de
 * resultados del motor. Revisión científica del texto: Efemérides/Ciencia (riesgo R11).
 */
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BatteryCharging,
  CalendarClock,
  Columns3,
  Globe,
  Radar,
  ScanSearch,
} from "lucide-react";

import { HorizonScene } from "@/components/learn/horizon-scene";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: "LUMEN · Sunlight and Earth-contact planner for lunar landing sites" },
};

// Física de referencia (sección 4.8 y 4.3). Caída por curvatura: d² / 2R con d = 100 km.
const CONDITIONS = [
  {
    figure: "1.54°",
    title: "Axis tilt",
    body: "The Moon's spin axis is nearly upright, so at the pole the Sun skims the horizon.",
  },
  {
    figure: "29.5 days",
    title: "One lunar day",
    body: "The Sun takes a month to circle the polar sky. One ridge in the way can mean days without power.",
  },
  {
    figure: "1.9°",
    title: "Earth's disc",
    body: "Earth hangs low in the north and libration moves it up and down, so contact comes and goes.",
  },
  {
    figure: "2.9 km",
    title: "Drop at 100 km",
    body: "No air means no refraction, and the surface curves away: distant terrain sits far lower.",
  },
] as const;

interface Feature {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
}

const VIEWS: Feature[] = [
  {
    href: "/site",
    icon: Radar,
    title: "Draws the real horizon",
    body: "A polar chart of the terrain skyline with the Sun and Earth tracks for your dates.",
  },
  {
    href: "/site?tab=timeline",
    icon: CalendarClock,
    title: "Maps light and contact by hour",
    body: "Day-by-hour heatmaps for Sun, Earth and both together, with the longest dark spell marked.",
  },
  {
    href: "/compare",
    icon: Columns3,
    title: "Compares up to four sites",
    body: "Two to four sites or dates side by side, with the best value in each row highlighted.",
  },
  {
    href: "/explore",
    icon: Globe,
    title: "Shows the Moon in 3D",
    body: "A globe lit from the real direction of the Sun, with your sites marked on it.",
  },
];

const DELAY_TOOLS: Feature[] = [
  {
    href: "/site?tab=whatif",
    icon: CalendarClock,
    title: "Tests every launch delay",
    body: "Plots sunlight and contact against days of delay and marks the dates that still work.",
  },
  {
    href: "/search",
    icon: ScanSearch,
    title: "Finds a better spot nearby",
    body: "Searches the terrain around a site for the point with the most light and Earth contact.",
  },
  {
    href: "/site?tab=power",
    icon: BatteryCharging,
    title: "Runs the battery through the night",
    body: "Simulates panels and battery across the dark spells and says whether the lander makes it.",
  },
];

const PIPELINE = [
  { step: "Terrain", body: "LOLA elevation models from NASA's Lunar Reconnaissance Orbiter." },
  { step: "Horizon", body: "Ray-casting in every direction, with the Moon's curvature." },
  { step: "Sun and Earth", body: "Positions from NAIF SPICE DE440 in the MOON_ME frame." },
  { step: "Visibility", body: "The share of each disc above the ridge, minus eclipses." },
  { step: "Metrics", body: "Hours of light and contact, dark spells, next sunset and Earthset." },
] as const;

function FeatureCard({ href, icon: Icon, title, body }: Feature) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-xl border border-surface bg-panel p-6 transition duration-200 hover:-translate-y-0.5 hover:border-muted/50"
    >
      <Icon aria-hidden="true" className="size-6 text-earth" />
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
      <ArrowRight
        aria-hidden="true"
        className="mt-auto size-4 text-muted transition group-hover:translate-x-1 group-hover:text-text"
      />
    </Link>
  );
}

function Section({
  id,
  title,
  lead,
  children,
  className,
}: {
  id: string;
  title: string;
  lead: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("border-t border-surface py-24 md:py-32", className)}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 id={`${id}-title`} className="text-3xl font-semibold tracking-tight md:text-4xl">
            {title}
          </h2>
          <p className="text-lg text-muted">{lead}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-6xl flex-col justify-center gap-10 px-6 py-16"
      >
        <div className="flex max-w-3xl flex-col gap-6 motion-safe:animate-rise">
          <p className="font-mono text-sm text-muted">
            Lunar Utility Map for Energy &amp; Networks
          </p>
          <h1
            id="hero-title"
            className="text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          >
            <span className="text-sun">Sunlight</span> and{" "}
            <span className="text-earth">Earth-contact</span> planner for lunar landing sites
          </h1>
          <p className="max-w-2xl text-lg text-muted">
            Pick a site and a date range. LUMEN traces the real terrain horizon and shows when the
            Sun can power a lander and when Earth is in view for a direct link.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/explore">Pick a landing site</ButtonLink>
            <ButtonLink href="/compare" variant="secondary">
              Compare two sites
            </ButtonLink>
          </div>
        </div>
        <div className="flex flex-col gap-4 motion-safe:animate-rise motion-safe:[animation-delay:150ms]">
          <HorizonScene />
          <p className="font-mono text-sm text-muted">
            At the south pole the Sun never climbs more than about 1.5° above the horizon.
          </p>
        </div>
      </section>

      <Section
        id="south-pole"
        title="Why the south pole is hard to plan for"
        lead="Near the pole the Sun and Earth both sit on the horizon, so the terrain around a site decides how much power and contact it gets."
      >
        <dl className="grid gap-px overflow-hidden rounded-xl border border-surface bg-surface sm:grid-cols-2 lg:grid-cols-4">
          {CONDITIONS.map((c) => (
            <div key={c.title} className="flex flex-col gap-2 bg-space p-6">
              <dt className="flex flex-col gap-2">
                <span className="font-mono text-3xl text-sun">{c.figure}</span>
                <span className="font-semibold">{c.title}</span>
              </dt>
              <dd className="text-sm text-muted">{c.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        id="views"
        title="Four views of every site"
        lead="All views share one clock: move the time in one and the others follow."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VIEWS.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </Section>

      <Section
        id="delays"
        title="Answers for when the launch date slips"
        lead="Missions rarely keep their dates. LUMEN re-runs the analysis for a later date or a nearby spot."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {DELAY_TOOLS.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </Section>

      <Section
        id="method"
        title="How the numbers are made"
        lead="Open NASA data and documented steps. Sun and Earth positions are checked against JPL Horizons, with a target error of 0.01° or less."
      >
        <ol className="grid gap-px overflow-hidden rounded-xl border border-surface bg-surface sm:grid-cols-2 lg:grid-cols-5">
          {PIPELINE.map((p, i) => (
            <li key={p.step} className="flex flex-col gap-2 bg-space p-6">
              <span className="font-mono text-sm text-earth">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-semibold">{p.step}</span>
              <span className="text-sm text-muted">{p.body}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/validation" variant="secondary">
            See the validation
          </ButtonLink>
          <ButtonLink href="/about#credits" variant="secondary">
            Read the data sources
          </ButtonLink>
        </div>
      </Section>

      <section aria-labelledby="close-title" className="border-t border-surface py-24 md:py-32">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6">
          <h2 id="close-title" className="text-4xl font-semibold tracking-tight md:text-6xl">
            See the <span className="text-sun">light</span>. Keep the{" "}
            <span className="text-earth">link</span>.
          </h2>
          <p className="max-w-xl text-lg text-muted">
            Choose a site near the south pole and see its next sunset and Earthset.
          </p>
          <ButtonLink href="/explore">Pick a landing site</ButtonLink>
        </div>
      </section>
    </>
  );
}
