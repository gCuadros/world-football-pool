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
    // Phosphor incluido: sus imports de barril (~1.500 iconos) sin optimizar
    // disparan el bundle cliente y la hidratación en móvil.
    optimizePackageImports: ["lucide-react", "@phosphor-icons/react"],
    // Transiciones de vista entre rutas (React `<ViewTransition>` del canal
    // canary que usa el App Router; no requiere instalar react@canary).
    viewTransition: true,
  },
};

export default nextConfig;
