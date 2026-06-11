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
    // Caché de cliente para segmentos dinámicos: volver a un tab visitado en
    // los últimos 30s pinta la copia cacheada al instante (sensación nativa)
    // en vez de esperar a la BD; AutoRefresh ya refresca lo que está en vivo.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
