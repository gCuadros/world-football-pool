// Feature flags controlados por variables de entorno.
// NEXT_PUBLIC_ para que estén disponibles también en el cliente (nav).
// Se evalúan en build: cambiarlos requiere un nuevo despliegue.

export const FEATURES = {
  // Mini-ligas (crear / unirse / ver). Desactivado por defecto.
  miniLeagues: process.env.NEXT_PUBLIC_FEATURE_MINI_LEAGUES === "true",
} as const;
