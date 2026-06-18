import "server-only";

import data from "@/data/fifa-physical-wc26.json";

// Instantánea de las métricas físicas oficiales de la FIFA (Enhanced Football
// Intelligence) del Mundial 2026. NO hay endpoint público en vivo para esto, así
// que es un snapshot estático (como hace la app de referencia); se actualiza
// regenerando el JSON. Clave: IdMatch FIFA → jugadores con sus físicas.
export type PlayerPhysical = {
  name: string;
  team: string | null;
  dist: number; // metros
  sprints: number | null;
  topSpeed: number | null; // km/h
  speedRuns: number | null;
  hsSprint: number | null; // metros a sprint alta velocidad
  minPlayed: number | null;
};

const PHYSICAL = data as Record<string, PlayerPhysical[]>;

/** Métricas físicas de los jugadores de un partido (por IdMatch FIFA). */
export function getMatchPhysical(idMatch: string): PlayerPhysical[] {
  return PHYSICAL[idMatch] ?? [];
}
