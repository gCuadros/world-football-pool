import "server-only";

import { cacheTag, cacheLife } from "next/cache";

import { prisma } from "@/lib/prisma";
import { isPredictionLocked } from "@/lib/scoring";
import { TAGS } from "@/lib/cache-tags";
import { getLeaderboardRows } from "@/lib/leaderboard";
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

// Datos del partido compartidos por todos los usuarios (cacheables).
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

// Vista por usuario = base + predicción propia + estado de cierre (por petición).
export type MatchVM = MatchBase & {
  prediction: PredictionVM | null;
  locked: boolean;
};

export type UserStatsVM = {
  points: number;
  rank: number | null;
  totalPlayers: number;
  accuracy: number;
  predictionsCount: number;
  exactCount: number;
  currentStreak: number;
};

/**
 * Calendario completo (compartido entre todos los usuarios) — CACHEADO (`use cache`).
 * Forma parte del shell prerenderizado; se invalida por tag al actualizar partidos.
 * No incluye nada dependiente del usuario ni del tiempo (eso se añade fuera).
 */
async function getMatchesBase(): Promise<MatchBase[]> {
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

/** Todos los partidos con la predicción del usuario y el estado de cierre. */
export async function getMatchesView(userId: string): Promise<MatchVM[]> {
  const now = new Date();
  // Calendario cacheado (compartido) + predicciones del usuario (ligero, por índice).
  const [base, predictions] = await Promise.all([
    getMatchesBase(),
    prisma.prediction.findMany({
      where: { userId },
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

/**
 * Estadísticas del usuario para la barra de cabecera.
 * Se derivan del leaderboard CACHEADO (0 consultas a BD por navegación).
 */
export async function getUserStatsView(userId: string): Promise<UserStatsVM> {
  const rows = await getLeaderboardRows();
  const me = rows.find((r) => r.userId === userId);
  return {
    points: me?.points ?? 0,
    rank: me?.rank ?? null,
    totalPlayers: rows.length,
    accuracy: me?.accuracy ?? 0,
    predictionsCount: me?.predictionsCount ?? 0,
    exactCount: me?.exactCount ?? 0,
    currentStreak: me?.currentStreak ?? 0,
  };
}

/** Lista de equipos (de la fase de grupos) con su bandera — CACHEADA (`use cache`). */
export async function getTeams(): Promise<
  { name: string; flag: string | null }[]
> {
  "use cache";
  cacheLife("max"); // la lista de equipos casi nunca cambia; el tag matches la invalida
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
  // Tras el kickoff las predicciones del partido son inmutables → muy cacheable.
  // El tag matches lo invalida cuando el sync cambia el estado del partido
  // (p. ej. UPCOMING→LIVE, que pasa de null a distribución).
  cacheLife("hours");
  cacheTag(TAGS.matches, `community-${matchId}`);

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return null;
  // Privacidad: solo se expone una vez iniciado el partido.
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

/**
 * Eventos (goles/tarjetas) de un partido — CACHEADO (`use cache`).
 * Solo desde API-Football y tras el inicio del partido. Sin clave o sin
 * externalId, devuelve lista vacía (no hay datos de eventos).
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
