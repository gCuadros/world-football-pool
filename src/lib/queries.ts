import "server-only";

import { cacheTag, cacheLife } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isPredictionLocked, MULTIPLIERS } from "@/lib/scoring";
import { TAGS } from "@/lib/cache-tags";
import {
  getApiFootballEvents,
  getApiFootballPrediction,
  getApiFootballLineups,
  getApiFootballStatistics,
  getApiFootballH2H,
  type MatchEvent,
  type MatchPrediction,
  type TeamLineup,
  type TeamStats,
  type H2HMatch,
} from "@/lib/providers/api-football";
import type { Stage, MatchStatus } from "@prisma/client";

export type PredictionVM = {
  homeScore: number;
  awayScore: number;
  points: number | null;
  exact: boolean;
  advancePick: "HOME" | "AWAY" | null;
};

export type MatchBase = {
  id: string;
  matchNo: number;
  externalId: string | null;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoffAt: string; // ISO (UTC)
  stage: Stage;
  group: string | null;
  stadium: string;
  city: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  liveMinute: number | null;
  advanced: "HOME" | "AWAY" | null;
};

export type MatchVM = MatchBase & {
  prediction: PredictionVM | null;
  locked: boolean;
};

/**
 * Calendario completo (compartido entre todos los usuarios) — CACHEADO (`use cache`).
 * Invalida con tag `matches` cuando se actualiza el calendario o resultados.
 */
export async function getMatchesBase(): Promise<MatchBase[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
  });
  return matches.map((m) => ({
    id: m.id,
    matchNo: m.matchNo,
    externalId: m.externalId,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeFlag: m.homeFlag,
    awayFlag: m.awayFlag,
    homeCrest: m.homeCrest,
    awayCrest: m.awayCrest,
    kickoffAt: m.kickoffAt.toISOString(),
    stage: m.stage,
    group: m.group,
    stadium: m.stadium,
    city: m.city,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    liveMinute: m.liveMinute,
    advanced: m.advanced,
  }));
}

/** Partidos con la predicción del usuario EN UNA LIGA CONCRETA. */
export async function getMatchesViewForLeague(
  userId: string,
  leagueId: string,
): Promise<MatchVM[]> {
  const now = new Date();
  const [base, predictions, league] = await Promise.all([
    getMatchesBase(),
    prisma.prediction.findMany({
      where: { userId, leagueId },
      select: { matchId: true, homeScore: true, awayScore: true, points: true, exact: true, advancePick: true },
    }),
    prisma.miniLeague.findUnique({
      where: { id: leagueId },
      select: { isFriendly: true },
    }),
  ]);

  // Una liga de amistosos solo muestra amistosos; las del Mundial los excluyen.
  const isFriendlyLeague = league?.isFriendly ?? false;
  const scoped = base.filter((m) =>
    isFriendlyLeague ? m.stage === "FRIENDLY" : m.stage !== "FRIENDLY",
  );

  const byMatch = new Map(predictions.map((p) => [p.matchId, p]));

  return scoped.map((m) => {
    const p = byMatch.get(m.id);
    return {
      ...m,
      prediction: p
        ? { homeScore: p.homeScore, awayScore: p.awayScore, points: p.points, exact: p.exact, advancePick: p.advancePick }
        : null,
      locked: isPredictionLocked(new Date(m.kickoffAt), now),
    };
  });
}

/** Última predicción del usuario para un partido (en cualquier liga) — para autorrelleno. */
export async function getLastPredictionForMatch(
  userId: string,
  matchId: string,
): Promise<PredictionVM | null> {
  const pred = await prisma.prediction.findFirst({
    where: { userId, matchId },
    orderBy: { updatedAt: "desc" },
    select: { homeScore: true, awayScore: true, points: true, exact: true, advancePick: true },
  });
  return pred ?? null;
}

/** Lista de equipos (de la fase de grupos) con su bandera — CACHEADA (`use cache`). */
export async function getTeams(): Promise<
  { name: string; flag: string | null }[]
> {
  "use cache";
  cacheLife("max");
  cacheTag(TAGS.matches);

  const matches = await prisma.match.findMany({
    where: { stage: "GROUP_STAGE" },
    select: { homeTeam: true, awayTeam: true, homeFlag: true, awayFlag: true },
  });
  const map = new Map<string, string | null>();
  for (const m of matches) {
    if (!map.has(m.homeTeam)) map.set(m.homeTeam, m.homeFlag);
    if (!map.has(m.awayTeam)) map.set(m.awayTeam, m.awayFlag);
  }
  return [...map.entries()]
    .map(([name, flag]) => ({ name, flag }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Distribución agregada de predicciones de la comunidad (solo tras el kickoff). */
export type CommunityDistribution = {
  total: number;
  scores: { label: string; count: number; pct: number }[];
  results: { home: number; draw: number; away: number };
};

export async function getCommunityDistribution(
  matchId: string,
): Promise<CommunityDistribution | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.matches, `community-${matchId}`);

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return null;
  if (match.status === "UPCOMING") return null;

  const predictions = await prisma.prediction.findMany({
    where: { matchId },
    select: { homeScore: true, awayScore: true },
  });

  const total = predictions.length;
  const scoreCounts = new Map<string, number>();
  let home = 0;
  let draw = 0;
  let away = 0;

  for (const p of predictions) {
    const label = `${p.homeScore}-${p.awayScore}`;
    scoreCounts.set(label, (scoreCounts.get(label) ?? 0) + 1);
    if (p.homeScore > p.awayScore) home++;
    else if (p.homeScore < p.awayScore) away++;
    else draw++;
  }

  const scores = [...scoreCounts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total,
    scores,
    results: {
      home: total > 0 ? Math.round((home / total) * 100) : 0,
      draw: total > 0 ? Math.round((draw / total) * 100) : 0,
      away: total > 0 ? Math.round((away / total) * 100) : 0,
    },
  };
}

/** Standings de los grupos del Mundial — CACHEADOS. */
export async function getWorldCupStandings() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    const { getApiFootballStandings } = await import(
      "@/lib/providers/api-football"
    );
    return await getApiFootballStandings();
  } catch {
    return [];
  }
}

/** Top Scorers del Mundial — CACHEADOS. */
export async function getWorldCupTopScorers() {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    const { getApiFootballTopScorers } = await import(
      "@/lib/providers/api-football"
    );
    return await getApiFootballTopScorers();
  } catch {
    return [];
  }
}

/**
 * Eventos (goles/tarjetas) de un partido — CACHEADO (`use cache`).
 */
export async function getMatchEvents(
  externalId: string,
): Promise<MatchEvent[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches, `events-${externalId}`);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    return await getApiFootballEvents(externalId);
  } catch {
    return [];
  }
}

/** Pronóstico (%) de un partido — CACHEADO. Incluye IDs de equipo para el h2h. */
export async function getMatchPrediction(
  externalId: string,
): Promise<MatchPrediction | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAGS.matches, `detail-${externalId}`);

  if (!process.env.API_FOOTBALL_KEY) return null;
  try {
    return await getApiFootballPrediction(externalId);
  } catch {
    return null;
  }
}

/** Alineaciones de un partido — CACHEADO. */
export async function getMatchLineups(
  externalId: string,
): Promise<TeamLineup[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches, `detail-${externalId}`);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    return await getApiFootballLineups(externalId);
  } catch {
    return [];
  }
}

/** Estadísticas de un partido — CACHEADO. */
export async function getMatchStatistics(
  externalId: string,
): Promise<TeamStats[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches, `detail-${externalId}`);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    return await getApiFootballStatistics(externalId);
  } catch {
    return [];
  }
}

const KNOCKOUT_STAGE_ORDER = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
] as const;

type KnockoutStage = (typeof KNOCKOUT_STAGE_ORDER)[number];

export type KnockoutRound = {
  stage: KnockoutStage;
  label: string;
  multiplier: number;
  matches: MatchBase[];
};

const KNOCKOUT_LABELS: Record<KnockoutStage, string> = {
  ROUND_OF_32: "Dieciseisavos",
  ROUND_OF_16: "Octavos",
  QUARTER_FINAL: "Cuartos",
  SEMI_FINAL: "Semifinales",
  THIRD_PLACE: "3.er Puesto",
  FINAL: "Final",
};

/** Partidos de eliminatoria agrupados por ronda, en orden — CACHEADO (`use cache`). */
export async function getKnockoutMatches(): Promise<KnockoutRound[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.matches);

  const rows = await prisma.match.findMany({
    where: { stage: { in: [...KNOCKOUT_STAGE_ORDER] } },
    orderBy: { kickoffAt: "asc" },
  });

  const grouped = new Map<KnockoutStage, MatchBase[]>();
  for (const m of rows) {
    const stage = m.stage as KnockoutStage;
    const list = grouped.get(stage) ?? [];
    list.push({
      id: m.id,
      matchNo: m.matchNo,
      externalId: m.externalId,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeFlag: m.homeFlag,
      awayFlag: m.awayFlag,
      homeCrest: m.homeCrest,
      awayCrest: m.awayCrest,
      kickoffAt: m.kickoffAt.toISOString(),
      stage: m.stage,
      group: m.group,
      stadium: m.stadium,
      city: m.city,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      status: m.status,
      liveMinute: m.liveMinute,
      advanced: m.advanced,
    });
    grouped.set(stage, list);
  }

  return KNOCKOUT_STAGE_ORDER
    .filter((s) => grouped.has(s))
    .map((s) => ({
      stage: s,
      label: KNOCKOUT_LABELS[s],
      multiplier: MULTIPLIERS[s],
      matches: grouped.get(s)!,
    }));
}

// ── Perfil público ────────────────────────────────────────────────────────────

export type PublicPrediction = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: string;
  homeScore: number; // predicción
  awayScore: number; // predicción
  actualHome: number | null; // resultado real
  actualAway: number | null; // resultado real
  points: number | null;
  exact: boolean;
};

export type PublicProfile = {
  id: string;
  name: string;
  avatar: string | null;
  favoriteTeam: string | null;
  createdAt: string;
};

/**
 * Predicciones públicas de un usuario: solo partidos FINISHED (no revela
 * predicciones futuras que darían ventaja). Deduplica por partido (muestra
 * la predicción con más puntos si predijo en varias ligas).
 */
export async function getPublicPredictions(
  userId: string,
): Promise<{ profile: PublicProfile | null; predictions: PublicPrediction[] }> {
  const [user, preds] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatar: true, favoriteTeam: true, createdAt: true },
    }),
    prisma.prediction.findMany({
      where: {
        userId,
        match: { status: "FINISHED" },
      },
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            homeFlag: true,
            awayFlag: true,
            kickoffAt: true,
            homeScore: true,
            awayScore: true,
          },
        },
      },
      orderBy: { match: { kickoffAt: "desc" } },
    }),
  ]);

  if (!user) return { profile: null, predictions: [] };

  // Deduplicar por matchId: quedarse con la predicción con más puntos.
  const byMatch = new Map<string, typeof preds[number]>();
  for (const p of preds) {
    const existing = byMatch.get(p.matchId);
    if (!existing || (p.points ?? 0) > (existing.points ?? 0)) {
      byMatch.set(p.matchId, p);
    }
  }

  const predictions: PublicPrediction[] = [...byMatch.values()]
    .slice(0, 40)
    .map((p) => ({
      matchId: p.matchId,
      homeTeam: p.match.homeTeam,
      awayTeam: p.match.awayTeam,
      homeFlag: p.match.homeFlag,
      awayFlag: p.match.awayFlag,
      kickoffAt: p.match.kickoffAt.toISOString(),
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      actualHome: p.match.homeScore,
      actualAway: p.match.awayScore,
      points: p.points,
      exact: p.exact,
    }));

  return {
    profile: {
      id: user.id,
      name: user.name ?? user.id,
      avatar: user.avatar,
      favoriteTeam: user.favoriteTeam,
      createdAt: user.createdAt.toISOString(),
    },
    predictions,
  };
}

/** Head-to-head entre dos equipos (por IDs de API-Football) — CACHEADO. */
export async function getMatchH2H(
  homeId: number,
  awayId: number,
): Promise<H2HMatch[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(`h2h-${homeId}-${awayId}`);

  if (!process.env.API_FOOTBALL_KEY) return [];
  try {
    return await getApiFootballH2H(homeId, awayId);
  } catch {
    return [];
  }
}
