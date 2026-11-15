"use client";

/** Enlaces de la navegación principal con la sección actual marcada. Owner: Producto/Diseño. */
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/compare", label: "Compare" },
  { href: "/search", label: "Best spot" },
  { href: "/learn", label: "Learn" },
  { href: "/validation", label: "Validation" },
  { href: "/about", label: "About" },
] as const;

const isCurrent = (pathname: string | null | undefined, href: string) =>
  pathname === href || (pathname?.startsWith(`${href}/`) ?? false);

export function NavList({ pathname }: { pathname?: string | null }) {
  return (
    <ul className="flex flex-wrap text-sm whitespace-nowrap text-muted sm:gap-2">
      {NAV.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md px-2.5 transition-colors hover:text-text",
                current && "text-text underline decoration-sun decoration-2 underline-offset-8",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Requiere `<Suspense>` por encima: con Cache Components, usePathname suspende en rutas dinámicas. */
export function CurrentNavList() {
  return <NavList pathname={usePathname()} />;
}
