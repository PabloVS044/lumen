import { afterEach, describe, expect, it, vi } from "vitest";

import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { metadata as rootMetadata } from "@/app/layout";
import { metadata as aboutMeta } from "@/app/about/page";
import { metadata as compareMeta } from "@/app/compare/page";
import { metadata as exploreMeta } from "@/app/explore/page";
import { metadata as homeMeta } from "@/app/(marketing)/page";
import { metadata as learnMeta } from "@/app/learn/page";
import { metadata as searchMeta } from "@/app/search/page";
import { metadata as siteMeta } from "@/app/site/page";
import { metadata as validationMeta } from "@/app/validation/page";

import {
  PUBLIC_ROUTES,
  absoluteUrl,
  jsonLdString,
  pageMetadata,
  siteUrl,
  webApplicationJsonLd,
} from "./seo";

vi.mock("next/font/google", () => ({
  Space_Grotesk: () => ({ variable: "" }),
  JetBrains_Mono: () => ({ variable: "" }),
}));

afterEach(() => vi.unstubAllEnvs());

describe("siteUrl", () => {
  it("falls back to localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(siteUrl()).toBe("http://localhost:3000");
  });
  it("strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lumen-web.fly.dev/");
    expect(siteUrl()).toBe("https://lumen-web.fly.dev");
    expect(absoluteUrl("/explore")).toBe("https://lumen-web.fly.dev/explore");
    expect(absoluteUrl("about")).toBe("https://lumen-web.fly.dev/about");
  });
});

describe("pageMetadata", () => {
  it("sets canonical and a complete openGraph", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://x.test");
    const m = pageMetadata({ title: "T", description: "D", path: "/t" });
    expect(m.alternates?.canonical).toBe("https://x.test/t");
    expect(m.openGraph).toMatchObject({
      url: "https://x.test/t",
      siteName: "LUMEN",
      type: "website",
    });
  });
});

describe("sitemap / robots / manifest", () => {
  it("lists every public route with absolute urls", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://x.test");
    const urls = sitemap().map((e) => e.url);
    expect(urls).toHaveLength(PUBLIC_ROUTES.length);
    expect(urls).toContain("https://x.test/");
    expect(urls).toContain("https://x.test/explore");
    for (const u of urls) expect(u.startsWith("https://x.test/")).toBe(true);
  });
  it("disallows the BFF and points to the sitemap", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://x.test");
    const r = robots();
    expect(r.rules).toMatchObject({ disallow: "/api/" });
    expect(r.sitemap).toBe("https://x.test/sitemap.xml");
  });
  it("has a valid manifest", () => {
    const m = manifest();
    expect(m.short_name).toBe("LUMEN");
    expect(m.start_url).toBe("/");
    expect(m.theme_color).toBe("#0b0e14");
    expect(m.icons?.[0]?.src).toBe("/icon.svg");
  });
});

describe("page metadata", () => {
  const titleOf = (m: { title?: unknown }) =>
    typeof m.title === "string" ? m.title : JSON.stringify(m.title);

  it("exports unique titles and descriptions", () => {
    const all = [
      exploreMeta,
      siteMeta,
      compareMeta,
      searchMeta,
      learnMeta,
      validationMeta,
      aboutMeta,
    ];
    expect(new Set(all.map(titleOf)).size).toBe(all.length);
    expect(new Set(all.map((m) => m.description)).size).toBe(all.length);
    expect(titleOf(homeMeta)).not.toBe(titleOf(rootMetadata));
  });
  it("root metadata has the SEO essentials", () => {
    expect(rootMetadata.metadataBase).toBeInstanceOf(URL);
    expect(rootMetadata.robots).toMatchObject({ index: true, follow: true });
    expect(rootMetadata.twitter).toMatchObject({ card: "summary_large_image" });
    expect(rootMetadata.description).toMatch(/not affiliated with or endorsed by NASA/);
  });
});

describe("JSON-LD", () => {
  it("escapes < so it cannot close the script tag", () => {
    const s = jsonLdString({ a: "</script><b>" });
    expect(s).not.toContain("<");
    expect(JSON.parse(s)).toEqual({ a: "</script><b>" });
  });
  it("describes a free web application", () => {
    const d = webApplicationJsonLd();
    expect(d).toMatchObject({
      "@type": "WebApplication",
      operatingSystem: "Web",
      offers: { price: "0" },
    });
  });
});
