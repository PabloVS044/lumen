import { jsonLdString } from "@/lib/seo";

/** Datos estructurados (schema.org) como <script type="application/ld+json">. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
  );
}
