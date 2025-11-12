import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const nextConfig: NextConfig = {
  // Pin Turbopack workspace root to this project to avoid multi-lockfile inference
  turbopack: {
    root: __dirname,
  },

  // Transpile local workspace packages that ship TS sources
  transpilePackages: ["@fishon/schemas", "@fishon/ui"],

  // Exclude test files from TypeScript checking during build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ["src"],
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ldpumtdoplh4cjvk.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },

      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
