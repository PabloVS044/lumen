/**
 * Limitador en memoria para el BFF /api/engine (sección 10.3: ~30 análisis nuevos/min por IP).
 *
 * Ventana deslizante (log de marcas de tiempo) por clave. Sin dependencias; el reloj es inyectable.
 * Por instancia: en despliegues con varias réplicas el límite es por réplica.
 */

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const DEFAULT_RATE_LIMIT_PER_MIN = 30;

/** Métodos caros (crean cálculos o exportaciones). El resto no se limita. */
export const EXPENSIVE_METHODS: ReadonlySet<string> = new Set([
  "lumen.v1.AnalysisService/Analyze",
  "lumen.v1.AnalysisService/Compare",
  "lumen.v1.SearchService/FindBestSpot",
  "lumen.v1.ExportService/CreateExport",
]);

export interface RateLimitDecision {
  allowed: boolean;
  /** Segundos hasta que vuelva a haber cupo (0 si está permitido). */
  retryAfterSec: number;
}

export interface RateLimiterOptions {
  /** Peticiones permitidas por ventana. */
  limit: number;
  windowMs?: number;
  /** Reloj en milisegundos; inyectable para tests. */
  now?: () => number;
}

export interface RateLimiter {
  hit(key: string): RateLimitDecision;
  /** Número de claves con marcas activas (para observar la memoria). */
  size(): number;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const limit = options.limit;
  const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();
  let lastSweep = now();

  /** Elimina claves cuyas marcas han salido de la ventana. Se ejecuta como mucho una vez por ventana. */
  function sweep(at: number): void {
    const cutoff = at - windowMs;
    for (const [key, stamps] of hits) {
      if (stamps.length === 0 || stamps[stamps.length - 1]! <= cutoff) hits.delete(key);
    }
    lastSweep = at;
  }

  return {
    hit(key) {
      const at = now();
      if (at - lastSweep >= windowMs) sweep(at);

      const cutoff = at - windowMs;
      const stamps = (hits.get(key) ?? []).filter((t) => t > cutoff);

      if (stamps.length >= limit) {
        hits.set(key, stamps);
        const oldest = stamps[0]!;
        const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - at) / 1000));
        return { allowed: false, retryAfterSec };
      }

      stamps.push(at);
      hits.set(key, stamps);
      return { allowed: true, retryAfterSec: 0 };
    },
    size() {
      return hits.size;
    },
  };
}

/** Lee RATE_LIMIT_PER_MIN; valores no válidos (no enteros positivos) usan el valor por defecto. */
export function parseRateLimitPerMin(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_RATE_LIMIT_PER_MIN;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return DEFAULT_RATE_LIMIT_PER_MIN;
  const value = Number(trimmed);
  return value > 0 ? value : DEFAULT_RATE_LIMIT_PER_MIN;
}

/** Primer salto de X-Forwarded-For; "unknown" si no hay cabecera. */
export function clientIp(forwardedFor: string | null): string {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first ? first : "unknown";
}
