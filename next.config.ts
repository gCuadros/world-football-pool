import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Cache Components: PPR + `use cache`. Dinámico por defecto; lo compartido se
  // marca con `'use cache'` y lo que usa cookies/auth va dentro de <Suspense>.
  cacheComponents: true,
  images: {
    // Escudos de equipos servidos por API-Football.
    remotePatterns: [{ protocol: "https", hostname: "media.api-sports.io" }],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
