import type { Stage } from "@prisma/client";

export const STAGE_LABELS: Record<Stage, string> = {
  GROUP_STAGE: "Fase de Grupos",
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semifinales",
  THIRD_PLACE: "Tercer puesto",
  FINAL: "Final",
  FRIENDLY: "Amistoso",
};

export const STAGE_SHORT: Record<Stage, string> = {
  GROUP_STAGE: "Grupos",
  ROUND_OF_32: "16avos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semis",
  THIRD_PLACE: "3.º",
  FINAL: "Final",
  FRIENDLY: "Amistoso",
};

// Filtros de la página de partidos. `value` mapea a status o stage.
export type MatchFilter =
  | "all"
  | "live"
  | "GROUP_STAGE"
  | "ROUND_OF_32"
  | "ROUND_OF_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "FINAL";

// La competición nunca tiene varias fases activas a la vez, así que el filtro
// por fase no aporta valor: solo "Todos" y "En Directo".
export const MATCH_FILTERS: { value: MatchFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "live", label: "En Directo" },
];
