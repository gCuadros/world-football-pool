import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Cache Components: PPR + `use cache`. Dinámico por defecto; lo compartido se
  // marca con `'use cache'` y lo que usa cookies/auth va dentro de <Suspense>.
  cacheComponents: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
