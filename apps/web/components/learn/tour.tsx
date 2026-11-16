"use client";

/**
 * Tour — M11 Modo Explorar (HU-11 AC2). Owner: Producto/Diseño (ver docs/team/ROLES.md).
 * Un tour es una escena y unos pasos con Back/Next; el último enlaza a la herramienta real en /site.
 * La escena se mantiene montada entre pasos, así que el tiempo sigue corriendo y el relieve se anima.
 */
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { ButtonLink, buttonClass } from "@/components/ui/button-link";

import { HorizonScene } from "./horizon-scene";
import type { TourData } from "./tours";

export function Tour({ tour }: { tour: TourData }) {
  const [index, setIndex] = useState(0);
  const step = tour.steps[index]!;
  const last = index === tour.steps.length - 1;
  const titleId = `${tour.id}-title`;

  return (
    <section id={tour.id} aria-labelledby={titleId} className="flex scroll-mt-6 flex-col gap-5">
      <div className="flex max-w-3xl flex-col gap-1">
        <h2 id={titleId} className="text-xl font-semibold text-text">
          {tour.title}
        </h2>
        <p className="text-muted">{tour.summary}</p>
      </div>

      <HorizonScene {...step.scene} />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div aria-live="polite" className="flex max-w-2xl flex-col gap-2">
          <p className="font-mono text-xs text-muted">
            Step {index + 1} of {tour.steps.length}
          </p>
          <h3 className="text-lg font-semibold text-text">{step.title}</h3>
          <p className="text-muted">{step.body}</p>
          {step.link && (
            <ButtonLink href={step.link.href} variant="secondary" className="mt-2 self-start">
              {step.link.label}
              <ArrowRight aria-hidden="true" className="size-4" />
            </ButtonLink>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0}
            className={buttonClass("secondary")}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setIndex(last ? 0 : index + 1)}
            className={buttonClass(last ? "secondary" : "primary")}
          >
            {last ? "Start over" : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}
