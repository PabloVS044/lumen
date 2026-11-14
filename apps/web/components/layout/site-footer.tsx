/**
 * Pie con atribuciones (sección 8.5) y aviso de independencia (sección 2.6). Owner: Producto/Diseño.
 * La lista completa de fuentes vive en /about#credits.
 */
import Link from "next/link";

import { LumenMark } from "@/components/ui/lumen-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-muted">
        <p className="flex items-center gap-2 font-semibold tracking-wide text-text">
          <LumenMark className="size-5" />
          LUMEN · Lunar Utility Map for Energy &amp; Networks
        </p>
        <p>
          Built for the NASA Space Apps Challenge 2026, Lunar Landing Site Navigator. Terrain from
          NASA LRO LOLA, ephemerides from NAIF SPICE DE440, 3D Moon from Cesium.{" "}
          <Link href="/about#credits" className="text-text underline underline-offset-4">
            Data and credits
          </Link>
        </p>
        <p>Independent project, not endorsed by NASA or any other agency named on this site.</p>
      </div>
    </footer>
  );
}
