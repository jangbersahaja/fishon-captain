import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack workspace root to this project to avoid multi-lockfile inference
  turbopack: {
    root: __dirname,
  },

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
    ],
  },
};

export default nextConfig;
