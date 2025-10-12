import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack workspace root to this project to avoid multi-lockfile inference
  turbopack: {
    root: __dirname,
  },

  // Exclude test files from build
  pageExtensions: ["tsx", "ts", "jsx", "js"].map((ext) => {
    return `page.${ext}`;
  }),

  webpack: (config) => {
    // Exclude test files from webpack bundle
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      loader: "ignore-loader",
    });
    return config;
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
