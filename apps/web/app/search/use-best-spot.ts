"use client";

/**
 * Búsqueda asíncrona de mejor punto (M12). Owner: Frontend Analysis (issue #41).
 * `FindBestSpot` devuelve un job; `GetBestSpotResult` responde JOB_NOT_READY hasta que termina.
 * Se consulta cada POLL_MS mientras no esté listo. El porcentaje de avance necesita
 * `JobService.GetJob` (R1), que aún no existe: por ahora solo se muestra "en curso".
 */
import { callUnaryMethod, useMutation, useTransport } from "@connectrpc/connect-query";
import { engineErrorCode, SearchService, type FindBestSpotRequest } from "@lumen/sdk";
import { useQuery } from "@tanstack/react-query";

export const POLL_MS = 1500;

export function useBestSpot() {
  const transport = useTransport();
  const find = useMutation(SearchService.method.findBestSpot);
  const jobId = find.data?.job?.jobId;

  const result = useQuery({
    queryKey: ["best-spot-result", jobId],
    enabled: Boolean(jobId),
    retry: false,
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      try {
        return await callUnaryMethod(
          transport,
          SearchService.method.getBestSpotResult,
          { jobId: jobId! },
          { signal },
        );
      } catch (err) {
        if (engineErrorCode(err) === "JOB_NOT_READY") return null; // aún calculando
        throw err;
      }
    },
    refetchInterval: (q) => (q.state.data === null ? POLL_MS : false),
  });

  return {
    start: (req: FindBestSpotRequest) => find.mutate(req),
    running: find.isPending || (Boolean(jobId) && !result.data && !result.error),
    result: result.data ?? undefined,
    error: find.error ?? result.error,
  };
}
