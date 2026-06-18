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

export type PlayerPhysicalAgg = {
  name: string;
  team: string | null;
  dist: number; // metros acumulados
  sprints: number;
  topSpeed: number; // máx del torneo
  matches: number;
};

/** Acumulado del torneo por jugador (suma distancia/sprints, máx velocidad). */
export function getTournamentPhysical(): PlayerPhysicalAgg[] {
  const byPlayer = new Map<string, PlayerPhysicalAgg>();
  for (const list of Object.values(PHYSICAL)) {
    for (const p of list) {
      const key = `${p.name}|${p.team ?? ""}`;
      const cur = byPlayer.get(key);
      if (cur) {
        cur.dist += p.dist;
        cur.sprints += p.sprints ?? 0;
        cur.topSpeed = Math.max(cur.topSpeed, p.topSpeed ?? 0);
        cur.matches += 1;
      } else {
        byPlayer.set(key, {
          name: p.name,
          team: p.team,
          dist: p.dist,
          sprints: p.sprints ?? 0,
          topSpeed: p.topSpeed ?? 0,
          matches: 1,
        });
      }
    }
  }
  return [...byPlayer.values()];
}
