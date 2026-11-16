"use client";

/**
 * Comparación Tierra vs Luna (HU-11 AC3): "en tu ciudad el Sol sube a 60°, aquí a 1.5°".
 * Owner: Producto/Diseño. Modelo en sun-height.ts (terreno plano, sin atmósfera).
 */
import { useId, useState } from "react";

import { EARTH_MAX_SUBSOLAR_LAT_DEG, MOON_MAX_SUBSOLAR_LAT_DEG, noonSunRange } from "./sun-height";

/** Cresta de Connecting ridge según el motor (docs/validation.md), la misma de los tours. */
const RIDGE_LAT_DEG = -89.4403;
const DEFAULT_LAT_DEG = 15;

const deg = (value: number) => `${Number(value.toFixed(1))}°`;
const latitude = (lat: number) =>
  lat === 0 ? "0°" : `${deg(Math.abs(lat))} ${lat > 0 ? "N" : "S"}`;
const lowest = (value: number) => (value < 0 ? `below the horizon (${deg(value)})` : deg(value));

function SunCard({ place, highest, low }: { place: string; highest: number; low: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-surface p-5">
      <p className="text-sm text-muted">{place}</p>
      <p className="font-mono text-4xl font-semibold text-sun">{deg(highest)}</p>
      <p className="text-sm text-muted">highest noon Sun of the year</p>
      <p className="mt-2 text-sm">
        <span className="text-muted">Lowest noon Sun: </span>
        <span className="text-text">{lowest(low)}</span>
      </p>
    </div>
  );
}

export function SunHeightCompare() {
  const inputId = useId();
  const [lat, setLat] = useState(DEFAULT_LAT_DEG);
  const home = noonSunRange(lat, EARTH_MAX_SUBSOLAR_LAT_DEG);
  const ridge = noonSunRange(RIDGE_LAT_DEG, MOON_MAX_SUBSOLAR_LAT_DEG);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-md flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor={inputId} className="font-semibold text-text">
            Your latitude
          </label>
          {/* El deslizador ya anuncia el valor con aria-valuetext. */}
          <span aria-hidden="true" className="font-mono text-text">
            {latitude(lat)}
          </span>
        </div>
        <input
          id={inputId}
          type="range"
          min={-90}
          max={90}
          step={1}
          value={lat}
          onChange={(e) => setLat(Number(e.target.value))}
          aria-valuetext={latitude(lat)}
          className="h-11 w-full cursor-pointer accent-sun"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SunCard
          place={`Where you live, ${latitude(lat)}`}
          highest={home.highest}
          low={home.lowest}
        />
        <SunCard
          place={`Connecting ridge, ${latitude(RIDGE_LAT_DEG)}`}
          highest={ridge.highest}
          low={ridge.lowest}
        />
      </div>

      <p role="status" className="max-w-3xl text-lg text-text">
        At noon the Sun climbs as high as {deg(home.highest)} where you live, but only{" "}
        {deg(ridge.highest)} at Connecting ridge.
      </p>
      <p className="max-w-3xl text-sm text-muted">
        On flat ground, with no atmosphere. The Moon&apos;s axis is tilted only about 1.5°, against
        23.4° for Earth, so its seasons barely move the Sun. Near the pole, terrain decides the
        rest, as the tours above show.
      </p>
    </div>
  );
}
