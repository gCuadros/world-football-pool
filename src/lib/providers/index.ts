import type { FootballProvider } from "@/lib/providers/types";
import { apiFootballProvider } from "@/lib/providers/api-football";
import { openfootballProvider } from "@/lib/providers/openfootball";

/**
 * Proveedor activo: API-Football si hay clave configurada (datos reales + en
 * vivo + escudos); si no, openfootball (calendario público, sin clave) como
 * fallback. El seed y el sync usan el mismo proveedor para que el `externalId`
 * sea consistente.
 */
export function getActiveProvider(): FootballProvider {
  return process.env.API_FOOTBALL_KEY ? apiFootballProvider : openfootballProvider;
}
