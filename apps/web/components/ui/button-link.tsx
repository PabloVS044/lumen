/**
 * Enlace con aspecto de botón. Owner: Producto/Diseño. Un solo par de estilos en toda la app:
 * `primary` (acción principal, dorado) y `secondary` (borde). Sube 1px al pasar, baja al pulsar.
 */
import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-sun text-space hover:bg-sun/90",
  secondary: "border border-muted/40 text-text hover:border-muted hover:bg-panel",
} as const;

/** Clases de botón, también para `<button>` (p. ej. los pasos de los tours). */
export function buttonClass(variant: keyof typeof VARIANTS = "primary", className?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 font-medium",
    "transition duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    className,
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof VARIANTS }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
