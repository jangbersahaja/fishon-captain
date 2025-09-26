import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack workspace root to this project to avoid multi-lockfile inference
  turbopack: {
    root: __dirname,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ldpumtdoplh4cjvk.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
