/**
 * Marca LUMEN (sección 18.1): Luna con terminador y la Tierra asomando sobre su horizonte.
 * Owner: Producto/Diseño. Misma geometría que app/icon.svg; si cambias una, cambia la otra.
 */
import { cn } from "@/lib/utils";

export function LumenMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("size-6 shrink-0", className)}
    >
      <circle cx="14" cy="18" r="11.5" strokeWidth="1" className="fill-surface stroke-muted" />
      <path d="M14 6.5A11.5 11.5 0 0 0 14 29.5A5.5 11.5 0 0 1 14 6.5Z" className="fill-sun" />
      <circle cx="25.5" cy="6.5" r="3.5" className="fill-earth" />
    </svg>
  );
}
