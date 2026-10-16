import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // «Ultimo ritocco» del colophon (/info): fissata al build, non letta durante il render
  env: { BUILD_DATE: new Date().toISOString() },
  // Rileva la rete assente e riprova navigazioni e prefetch al ritorno (hook useOffline)
  experimental: { useOffline: true },
  images: {
    // Solo gli host delle fonti (domain/images.ts): l'optimizer non è un proxy aperto
    remotePatterns: ["torino.circololettori.it", "img.evbuc.com", "api.museoegizio.it", "cdn.zero.eu"].map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
  // Pacchetto workspace in TS sorgente
  transpilePackages: ["@smemogp/db"],
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
