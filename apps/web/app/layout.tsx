import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

import { Providers } from "./providers";
import "./globals.css";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const data = JetBrains_Mono({ variable: "--font-data", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "LUMEN", template: "%s · LUMEN" },
  description: "Lunar Utility Map for Energy & Networks. See the light. Keep the link.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${data.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>
          <SiteHeader />
          <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
