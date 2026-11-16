/**
 * Ruta /learn — Owner: Producto/Diseño (ver docs/team/ROLES.md). Sección 12.1, M11 (HU-11):
 * modo Explorar con tres tours y la comparación Tierra vs Luna.
 */
import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { SunHeightCompare } from "@/components/learn/sun-height-compare";
import { Tour } from "@/components/learn/tour";
import { TOURS } from "@/components/learn/tours";

export const metadata: Metadata = {
  title: "Learn",
  description:
    "Guided tours on why sunlight and contact with Earth are so hard to plan at the lunar south pole.",
};

const chip =
  "inline-flex min-h-11 items-center rounded-full border border-surface px-4 text-sm text-muted transition-colors hover:border-muted hover:text-text";

export default function Page() {
  return (
    <PageShell title="Learn">
      <div className="flex flex-col gap-20 pb-10">
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="text-lg text-muted">
            Three short tours on why sunlight and contact with Earth are so hard to plan at the
            lunar south pole. The drawings are sketches with made-up terrain. The figures for real
            places come from LUMEN&apos;s engine.
          </p>
          <nav aria-label="Tours">
            <ul className="flex flex-wrap gap-2">
              {TOURS.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className={chip}>
                    {t.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#sun-height" className={chip}>
                  How high the Sun gets
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {TOURS.map((t) => (
          <Tour key={t.id} tour={t} />
        ))}

        <section
          id="sun-height"
          aria-labelledby="sun-height-title"
          className="flex scroll-mt-6 flex-col gap-5"
        >
          <div className="flex max-w-3xl flex-col gap-1">
            <h2 id="sun-height-title" className="text-xl font-semibold text-text">
              How high the Sun gets
            </h2>
            <p className="text-muted">
              Move the slider to your latitude and compare your noon Sun with the Moon&apos;s.
            </p>
          </div>
          <SunHeightCompare />
        </section>
      </div>
    </PageShell>
  );
}
