/**
 * SkyCompass — az/el de Sol y Tierra en el sitio, tal como los entrega el motor. Owner: Frontend 3D.
 * Los números son la fuente de verdad; el dibujo es un apoyo (aria-hidden).
 */
interface Pointing {
  az: number;
  el: number;
}

const R = 40;
const CENTER = 50;

function Dot({ az, className }: { az: number; className: string }) {
  const a = (az * Math.PI) / 180; // azimut desde el norte, sentido horario
  return (
    <circle
      cx={CENTER + R * Math.sin(a)}
      cy={CENTER - R * Math.cos(a)}
      r={5}
      className={className}
    />
  );
}

const fmt = (deg: number) => `${deg.toFixed(1)}°`;

export function SkyCompass({ sun, earth }: { sun: Pointing; earth: Pointing }) {
  const row = (name: string, p: Pointing, tone: string) => (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={tone}>{name}</dt>
      <dd className="font-mono">
        az {fmt(p.az)} el {fmt(p.el)}{" "}
        <span className="text-muted">({p.el >= 0 ? "above" : "below"} horizon)</span>
      </dd>
    </div>
  );
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="size-24 shrink-0" aria-hidden="true">
        <circle
          cx={CENTER}
          cy={CENTER}
          r={R}
          className="fill-none stroke-surface"
          strokeWidth={2}
        />
        <text x={CENTER} y={9} textAnchor="middle" className="fill-muted text-[9px]">
          N
        </text>
        <Dot az={sun.az} className="fill-sun" />
        <Dot az={earth.az} className="fill-earth" />
      </svg>
      <dl className="flex-1 text-sm">
        {row("Sun", sun, "text-sun")}
        {row("Earth", earth, "text-earth")}
      </dl>
    </div>
  );
}
