import type { MetadataRoute } from "next";

import { PUBLIC_ROUTES, absoluteUrl } from "@/lib/seo";

// Sin llamadas al motor: solo rutas estáticas. lastModified = fecha de build.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map(({ path, priority, changeFrequency }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
