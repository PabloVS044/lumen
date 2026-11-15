"use client";

/**
 * Resultados de ValidationService.GetReport (HU-13 AC1). Owner: Producto/Diseño + Ciencia.
 * Solo muestra lo que devuelve el motor; sin informe, lo dice en lugar de inventar cifras.
 */
import { useQuery } from "@connectrpc/connect-query";
import { isUnimplemented, ValidationService } from "@lumen/sdk";
import { CircleCheck, CircleX } from "lucide-react";
import { useId } from "react";

import {
  type CheckFields,
  describeCheck,
  formatMagnitude,
  formatMargin,
  margin,
  summarize,
} from "./format";

const cell = "px-3 py-3 align-top first:pl-4 last:pr-4 sm:px-4";
// En pantallas estrechas el margen (dato derivado, ya citado en el resumen) se oculta.
const marginCell = "hidden sm:table-cell";

export function ValidationTable({ checks }: { checks: CheckFields[] }) {
  const captionId = useId();
  return (
    // Región enfocable: si aun así no cabe, la tabla se desplaza en horizontal con el teclado.
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-surface"
    >
      <table className="w-full text-left text-sm">
        <caption id={captionId} className="sr-only">
          Validation checks: limit, worst error, margin and result
        </caption>
        <thead className="text-muted">
          <tr className="border-b border-surface">
            <th scope="col" className={`${cell} font-medium`}>
              Check
            </th>
            <th scope="col" className={`${cell} font-medium`}>
              Limit
            </th>
            <th scope="col" className={`${cell} font-medium`}>
              Worst error
            </th>
            <th scope="col" className={`${cell} ${marginCell} font-medium`}>
              Margin
              <span className="block font-normal">limit ÷ error</span>
            </th>
            <th scope="col" className={`${cell} font-medium`}>
              Result
            </th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => {
            const info = describeCheck(c);
            const ratio = margin(c.tolerance, c.maxError);
            const Icon = c.passed ? CircleCheck : CircleX;
            return (
              <tr key={c.id} className="border-b border-surface last:border-0">
                <th scope="row" className={`${cell} font-normal`}>
                  <span className="block font-semibold text-text">{info.label}</span>
                  {info.reference && <span className="block text-muted">vs {info.reference}</span>}
                </th>
                <td className={`${cell} font-mono whitespace-nowrap`}>
                  {formatMagnitude(c.tolerance, info.unit)}
                </td>
                <td className={`${cell} font-mono whitespace-nowrap text-text`}>
                  {formatMagnitude(c.maxError, info.unit)}
                </td>
                <td className={`${cell} ${marginCell} font-mono whitespace-nowrap`}>
                  {ratio === undefined ? "exact" : formatMargin(ratio)}
                </td>
                <td className={cell}>
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${c.passed ? "text-good" : "text-bad"}`}
                  >
                    <Icon aria-hidden className="size-4" />
                    {/* Solo icono en móvil; el texto sigue para lectores de pantalla. */}
                    <span className="sr-only sm:not-sr-only">{c.passed ? "Pass" : "Fail"}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ValidationReport() {
  const { data, error, isPending, isFetching, refetch } = useQuery(
    ValidationService.method.getReport,
    {},
    { retry: (failures, err) => !isUnimplemented(err) && failures < 1 },
  );

  if (isPending) {
    return (
      <p role="status" className="text-muted">
        Loading the validation report…
      </p>
    );
  }

  if (error) {
    if (isUnimplemented(error)) {
      return (
        <p className="rounded-lg border border-surface p-4">
          The engine connected to this site does not serve the validation report yet.
        </p>
      );
    }
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border border-bad/40 p-4"
      >
        <p>
          The validation report could not be loaded.{" "}
          <span className="text-text">{error.message}</span>
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex min-h-11 items-center rounded-md border border-muted/40 px-4 font-semibold text-text transition hover:bg-surface active:scale-[0.98] disabled:opacity-60"
        >
          {isFetching ? "Trying again…" : "Try again"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-text">{summarize(data.checks)}</p>
      {data.checks.length > 0 && <ValidationTable checks={data.checks} />}
    </div>
  );
}
