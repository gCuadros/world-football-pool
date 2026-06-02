import "server-only";

import { cacheTag, cacheLife } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isPredictionLocked } from "@/lib/scoring";
import { TAGS } from "@/lib/cache-tags";
import {
  getApiFootballEvents,
  type MatchEvent,
} from "@/lib/providers/api-football";
import type { Stage, MatchStatus } from "@prisma/client";

export type PredictionVM = {
  homeScore: number;
  awayScore: number;
  points: number | null;
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
  }));
}

/** Partidos con la predicción del usuario EN UNA LIGA CONCRETA. */
export async function getMatchesViewForLeague(
  userId: string,
  leagueId: string,
): Promise<MatchVM[]> {
  const now = new Date();
  const [base, predictions] = await Promise.all([
    getMatchesBase(),
    prisma.prediction.findMany({
      where: { userId, leagueId },
      select: { matchId: true, homeScore: true, awayScore: true, points: true },
    }),
  ]);

  const byMatch = new Map(predictions.map((p) => [p.matchId, p]));

  return base.map((m) => {
    const p = byMatch.get(m.id);
    return {
      ...m,
      prediction: p
        ? { homeScore: p.homeScore, awayScore: p.awayScore, points: p.points }
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
    select: { homeScore: true, awayScore: true, points: true },
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
