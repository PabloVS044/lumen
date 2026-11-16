import { existsSync } from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";

// Monorepo: el `.env` del equipo vive en la raíz del repo (ver .env.example y docs/team/ONBOARDING.md),
// pero Next solo lee los .env* de apps/web. Se cargan también los de la raíz. `process.loadEnvFile`
// no sobrescribe variables ya definidas: ganan el entorno y apps/web/.env*, y `.env.local` gana a `.env`.
const repoRoot = path.resolve(process.cwd(), "../..");
for (const file of [".env.local", ".env"]) {
  const envPath = path.join(repoRoot, file);
  if (existsSync(envPath)) process.loadEnvFile(envPath);
}

const nextConfig: NextConfig = {
  /* config options here */
  // El SDK se consume como TypeScript fuente del workspace.
  transpilePackages: ["@lumen/sdk"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
