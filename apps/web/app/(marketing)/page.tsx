/** Landing. Owner: Producto/Diseño. Sección 18. */
import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <p className="font-mono text-sm text-muted">Lunar Utility Map for Energy &amp; Networks</p>
      <h1 className="text-5xl font-semibold leading-tight">
        See the <span className="text-sun">light</span>. Keep the{" "}
        <span className="text-earth">link</span>.
      </h1>
      <p className="max-w-2xl text-lg text-muted">
        Compare lunar landing sites and dates by sunlight and direct-to-Earth visibility, computed
        from LOLA terrain and SPICE ephemerides.
      </p>
      <Link
        href="/explore"
        className="w-fit rounded-md bg-sun px-5 py-2.5 font-medium text-space hover:opacity-90"
      >
        Explore the south pole
      </Link>
    </div>
  );
}
