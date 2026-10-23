import path from "node:path";

import type { NextConfig } from "next";

// This app lives in `apps/web`, but npm hoists `node_modules` to the
// monorepo root. Point Turbopack at the repository root so it can resolve
// the `next` package (and treat the whole workspace as the build root).
const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
