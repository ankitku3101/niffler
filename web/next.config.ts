import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin this explicitly: the repo root also has its own package-lock.json
  // (for the backend's tsx scripts), which otherwise makes Turbopack guess
  // wrong about which directory is the actual project root.
  turbopack: {
    root: path.join(__dirname),
  },
  // Purely a dev-time cosmetic toggle — the floating dev badge was
  // overlapping content in full-page screenshots during review.
  devIndicators: false,
};

export default nextConfig;
