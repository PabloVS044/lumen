"use client";

import { useQuery } from "@connectrpc/connect-query";
import { EphemerisService } from "@lumen/sdk";
import { keepPreviousData } from "@tanstack/react-query";
import { useMemo } from "react";

import { hourSplit, normalize, slerp, type Vec3 } from "./lighting";

const HOUR_MS = 3_600_000;
const toVec = (v?: Vec3): Vec3 | undefined =>
  v ? normalize({ x: v.x, y: v.y, z: v.z }) : undefined;

const mix = (x: Vec3 | undefined, y: Vec3 | undefined, frac: number) =>
  x && y ? slerp(x, y, frac) : x;

function useStateAt(start: Date, offsetHours: number, enabled: boolean) {
  return useQuery(
    EphemerisService.method.getState,
    { time: { seconds: BigInt((start.getTime() + offsetHours * HOUR_MS) / 1000) } },
    { enabled, staleTime: Infinity, placeholderData: keepPreviousData },
  );
}

/**
 * Direcciones Sol/Tierra en MOON_ME para `time` (ISO UTC). Pide `GetState` en la hora entera
 * anterior y la siguiente (cacheables por hora, sección 9.11) e interpola; una tercera consulta
 * deja la siguiente hora precargada mientras corre la reproducción.
 */
export function useSunEarth(time: string | null) {
  const date = time ? new Date(time) : null;
  const valid = date !== null && !Number.isNaN(date.getTime());
  const { start, frac } = hourSplit(valid ? date : new Date(0));

  const a = useStateAt(start, 0, valid);
  const b = useStateAt(start, 1, valid);
  useStateAt(start, 2, valid);

  // Referencias estables: solo cambian cuando cambian los datos o la fracción de hora.
  const sun = useMemo(
    () => mix(toVec(a.data?.sunDir), toVec(b.data?.sunDir), frac),
    [a.data, b.data, frac],
  );
  const earth = useMemo(
    () => mix(toVec(a.data?.earthDir), toVec(b.data?.earthDir), frac),
    [a.data, b.data, frac],
  );
  return { sun, earth, error: a.error ?? b.error };
}
