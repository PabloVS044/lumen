/**
 * SEO centralizado: URL pública, textos por defecto y helper de metadata por página.
 * NEXT_PUBLIC_APP_URL se incrusta en build (ver .env.example): hay que pasarla como build arg en el despliegue.
 * Nada de NASA: LUMEN no usa su marca y no está afiliado (doc 2.1 y 18).
 */
import type { Metadata } from "next";

export const SITE_NAME = "LUMEN";
export const SITE_TAGLINE = "See the light. Keep the link.";
export const SITE_FULL_NAME = "Lunar Utility Map for Energy & Networks";
export const DEFAULT_TITLE = "LUMEN · Sunlight and Earth-contact planner for lunar landing sites";
export const DEFAULT_DESCRIPTION =
  "Plan lunar landing sites: for any point on the Moon and any date range, see when the Sun (power) and Earth (direct-to-Earth link) are above the real terrain horizon. Built for the NASA Space Apps Challenge 2026; not affiliated with or endorsed by NASA.";
export const KEYWORDS = [
  "lunar south pole",
  "lunar landing site",
  "Moon landing site planning",
  "solar illumination",
  "Earth visibility",
  "direct-to-Earth communication",
  "terrain horizon",
  "LOLA",
  "SPICE",
  "Artemis planning",
] as const;

/** Tokens de marca (apps/web/app/globals.css, doc 18.1). */
export const BRAND = {
  space: "#0b0e14",
  text: "#e8ebf1",
  muted: "#9aa3b2",
  sun: "#f5b700",
  earth: "#3fa7ff",
} as const;

/** Rutas públicas indexables (sin parámetros de consulta). */
export const PUBLIC_ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/explore", priority: 0.9, changeFrequency: "weekly" },
  { path: "/compare", priority: 0.7, changeFrequency: "monthly" },
  { path: "/search", priority: 0.7, changeFrequency: "monthly" },
  { path: "/site", priority: 0.6, changeFrequency: "monthly" },
  { path: "/learn", priority: 0.6, changeFrequency: "monthly" },
  { path: "/validation", priority: 0.5, changeFrequency: "monthly" },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" },
] as const;

/** URL base del sitio, sin barra final. */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteUrl(path = "/"): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

// El openGraph de página reemplaza al del layout y pierde la imagen de app/opengraph-image: se repite aquí.
const SHARE_IMAGE = () => ({
  url: absoluteUrl("/opengraph-image"),
  width: 1200,
  height: 630,
  alt: `${SITE_NAME}: ${SITE_TAGLINE}`,
});

interface PageSeo {
  title: string;
  description: string;
  path: string;
}

/**
 * Metadata de una página. `openGraph` en una página reemplaza al del layout (merge superficial),
 * por eso se repite completo. El canonical es siempre la ruta sin parámetros: /site, /compare y /search
 * usan lat/lon/fechas en la URL y todas las variantes son la misma página, así se evita contenido duplicado
 * sin necesidad de noindex.
 */
export function pageMetadata({ title, description, path }: PageSeo): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url,
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [SHARE_IMAGE()],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [SHARE_IMAGE()],
    },
  };
}

/** Serializa JSON-LD escapando `<` para que no pueda cerrar la etiqueta <script>. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function webApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    alternateName: SITE_FULL_NAME,
    description: DEFAULT_DESCRIPTION,
    url: siteUrl(),
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    inLanguage: "en",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}
