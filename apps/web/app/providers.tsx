"use client";

import { TransportProvider } from "@connectrpc/connect-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState, type ReactNode } from "react";

import { transport } from "@/lib/api/transport";

// Compartido (docs/team/ROLES.md). Resultados del motor son deterministas -> staleTime alto (sección 12.4).
// Datos: `useQuery(Service.method.x, input)` de @connectrpc/connect-query con tipos de @lumen/sdk.
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 60 * 60 * 1000, retry: 1 } },
      }),
  );
  return (
    <TransportProvider transport={transport}>
      <QueryClientProvider client={client}>
        <NuqsAdapter>{children}</NuqsAdapter>
      </QueryClientProvider>
    </TransportProvider>
  );
}
