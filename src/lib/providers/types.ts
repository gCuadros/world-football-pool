import type { Stage, MatchStatus } from "@prisma/client";

// Partido normalizado, independiente del proveedor de datos.
export type ProviderFixture = {
  matchNo: number;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: Date;
  stage: Stage;
  group: string | null;
  stadium: string;
  city: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
};

/**
 * Interfaz común a todos los proveedores (openfootball, football-data.org,
 * API-Football…). Cambiar de proveedor no debería tocar el resto de la app.
 */
export interface FootballProvider {
  name: string;
  /** Calendario completo (con resultados/estado si el proveedor los da). */
  getFixtures(): Promise<ProviderFixture[]>;
}
