import { ImageResponse } from "next/og";

import { BRAND, SITE_FULL_NAME, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE} Sunlight and Earth-contact planner for lunar landing sites`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fuentes del sistema (sin descargas en build). Marca propia: sin logo ni insignia de NASA.
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 96,
        background: BRAND.space,
        color: BRAND.text,
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <div
          style={{
            display: "flex",
            width: 120,
            height: 120,
            borderRadius: 60,
            background: BRAND.sun,
          }}
        />
        <div
          style={{
            display: "flex",
            width: 44,
            height: 44,
            borderRadius: 22,
            background: BRAND.earth,
          }}
        />
      </div>
      <div
        style={{ display: "flex", fontSize: 168, fontWeight: 700, letterSpacing: 8, marginTop: 40 }}
      >
        {SITE_NAME}
      </div>
      <div style={{ display: "flex", fontSize: 52, color: BRAND.sun, marginTop: 8 }}>
        {SITE_TAGLINE}
      </div>
      <div style={{ display: "flex", fontSize: 30, color: BRAND.muted, marginTop: 32 }}>
        {SITE_FULL_NAME}
      </div>
    </div>,
    size,
  );
}
