/** Navegación principal. Owner: Producto/Diseño. */
import Link from "next/link";

const NAV = [
  { href: "/explore", label: "Explore" },
  { href: "/compare", label: "Compare" },
  { href: "/search", label: "Best spot" },
  { href: "/learn", label: "Learn" },
  { href: "/validation", label: "Validation" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between border-b border-surface px-6 py-4">
      <Link href="/" className="font-semibold tracking-wide">
        LUMEN
      </Link>
      <nav aria-label="Main">
        <ul className="flex gap-5 text-sm text-muted">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="hover:text-text">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
