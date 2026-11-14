import type { NextConfig } from "next";

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
