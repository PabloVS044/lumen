/** Cabecera y navegación principal. Owner: Producto/Diseño. */
import Link from "next/link";
import { Suspense } from "react";

import { LumenMark } from "@/components/ui/lumen-mark";

import { CurrentNavList, NavList } from "./nav-links";

export function SiteHeader() {
  return (
    <header className="border-b border-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-panel focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 px-6 py-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 font-semibold tracking-wide"
        >
          <LumenMark />
          LUMEN
        </Link>
        {/* -mx-2.5 compensa el padding de cada enlace: el texto queda en los bordes de la página. */}
        <nav aria-label="Main" className="-mx-2.5">
          <Suspense fallback={<NavList />}>
            <CurrentNavList />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}
