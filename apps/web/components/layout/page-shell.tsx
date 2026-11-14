/** Contenedor estándar de página. Owner: Producto/Diseño. */
import type { ReactNode } from "react";

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}
