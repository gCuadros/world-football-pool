import "server-only";

import { cacheTag, cacheLife } from "next/cache";

import { prisma } from "@/lib/prisma";
import { TAGS, leagueTag } from "@/lib/cache-tags";
import type { AchievementType } from "@prisma/client";
import { scorePrediction, maxPointsFor } from "@/lib/scoring";

function initials(name: string | null | undefined, email: string): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  avatar: string | null;
  points: number;
  /** Puntos provisionales de partidos EN JUEGO. NO van en `points` (que es el
   *  consolidado, == perfil); la UI los muestra aparte como "+N en directo". */
  livePoints: number;
  accuracy: number;
  predictionsCount: number;
  exactCount: number;
  currentStreak: number;
  bestStreak: number;
  isCurrentUser: boolean;
};

export type LeagueVM = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
};

/**
 * Base CONSOLIDADA de la clasificación (solo partidos terminados) — CACHEADA.
 * Es estable e idéntica al perfil. La capa en directo se añade aparte, fresca,
 * en getLeagueLeaderboard (así no se queda "pegada" en la caché cuando un
 * partido en juego termina).
 */
async function getConsolidatedLeaderboard(
  leagueId: string,
  currentUserId: string,
): Promise<LeaderboardRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(leagueTag(leagueId), TAGS.users, TAGS.matches);

  const [members, finishedMatches, predictions] = await Promise.all([
    prisma.miniLeagueMember.findMany({
      where: { miniLeagueId: leagueId },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      orderBy: { kickoffAt: "asc" },
      select: { id: true, stage: true },
    }),
    prisma.prediction.findMany({
      where: { leagueId },
      select: { userId: true, matchId: true, points: true, exact: true, homeScore: true, awayScore: true, advancePick: true },
    }),
  ]);

  const finishedOrder = finishedMatches.map((m) => m.id);
  const finishedSet = new Set(finishedOrder);
  const stageByMatch = new Map(finishedMatches.map((m) => [m.id, m.stage]));

  const predsByUser = new Map<string, (typeof predictions)[number][]>();
  for (const p of predictions) {
    const arr = predsByUser.get(p.userId) ?? [];
    arr.push(p);
    predsByUser.set(p.userId, arr);
  }

  const rows: LeaderboardRow[] = members.map(({ user }) => {
    const userPreds = predsByUser.get(user.id) ?? [];
    const finished = userPreds.filter((p) => finishedSet.has(p.matchId));

    const totalPoints = finished.reduce((s, p) => s + (p.points ?? 0), 0);
    const exactCount = finished.filter((p) => p.exact).length;
    const predictionsCount = finished.length;
    // Precisión = puntos rascados / máximo puntuable de lo predicho. Un 1X2
    // sin exacto no es un acierto pleno: es 1 de los 5 (u 8) en juego.
    const maxPossible = finished.reduce(
      (s, p) => s + maxPointsFor(stageByMatch.get(p.matchId)!),
      0,
    );
    const accuracy =
      maxPossible > 0 ? Math.round((totalPoints / maxPossible) * 1000) / 10 : 0;

    const byMatch = new Map(finished.map((p) => [p.matchId, p]));
    let bestStreak = 0;
    let runningStreak = 0;
    let currentStreak = 0;
    for (const matchId of finishedOrder) {
      const p = byMatch.get(matchId);
      if (p && (p.points ?? 0) > 0) {
        runningStreak++;
        bestStreak = Math.max(bestStreak, runningStreak);
        currentStreak = runningStreak;
      } else if (p) {
        runningStreak = 0;
        currentStreak = 0;
      }
    }

    return {
      rank: 0,
      userId: user.id,
      name: user.name ?? user.email,
      initials: initials(user.name, user.email),
      avatar: user.avatar ?? null,
      points: totalPoints, // consolidado; el directo lo añade el envoltorio
      livePoints: 0,
      accuracy,
      predictionsCount,
      exactCount,
      currentStreak,
      bestStreak,
      isCurrentUser: user.id === currentUserId,
    };
  });

  rows.sort((a, b) => b.points - a.points || b.accuracy - a.accuracy);
  rows.forEach((r, i) => (r.rank = i + 1));

  return rows;
}

/**
 * Clasificación de una liga. Toma la base consolidada (cacheada, == perfil) y le
 * añade ENCIMA los puntos provisionales de los partidos EN JUEGO, calculados
 * FRESCOS en cada petición. Así:
 *  - Sin partidos en vivo → idéntica al perfil (consolidado puro).
 *  - Con partidos en vivo → el RANKING se reordena en directo (ordena por
 *    consolidado + provisional). El total mostrado sigue siendo el consolidado
 *    (== perfil) y el directo se ve en el badge "+N". Fresco: no se queda pegado
 *    en la caché cuando el partido termina.
 */
export async function getLeagueLeaderboard(
  leagueId: string,
  currentUserId: string,
): Promise<LeaderboardRow[]> {
  const base = await getConsolidatedLeaderboard(leagueId, currentUserId);

  const liveMatches = await prisma.match.findMany({
    where: { status: "LIVE" },
    select: { id: true, homeScore: true, awayScore: true, stage: true, advanced: true },
  });
  if (liveMatches.length === 0) return base;

  const liveById = new Map(liveMatches.map((m) => [m.id, m]));
  const livePreds = await prisma.prediction.findMany({
    where: { leagueId, matchId: { in: liveMatches.map((m) => m.id) } },
    select: { userId: true, matchId: true, homeScore: true, awayScore: true, advancePick: true },
  });

  const liveByUser = new Map<string, number>();
  for (const p of livePreds) {
    const lm = liveById.get(p.matchId);
    if (!lm) continue;
    const breakdown = scorePrediction(
      { homeScore: p.homeScore, awayScore: p.awayScore, advancePick: p.advancePick },
      { homeScore: lm.homeScore, awayScore: lm.awayScore, stage: lm.stage, advanced: lm.advanced },
    );
    liveByUser.set(p.userId, (liveByUser.get(p.userId) ?? 0) + (breakdown?.total ?? 0));
  }

  // Capa en directo (objetos nuevos: no mutar la caché). `points` se mantiene
  // consolidado (== perfil, sin doble conteo con el badge "+N"); el ranking se
  // reordena por consolidado + provisional, así la tabla se mueve gol a gol.
  const rows = base.map((r) => ({
    ...r,
    livePoints: liveByUser.get(r.userId) ?? 0,
  }));
  rows.sort(
    (a, b) =>
      b.points + b.livePoints - (a.points + a.livePoints) ||
      b.accuracy - a.accuracy,
  );
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}

/** Puesto del usuario en una liga concreta. */
export async function getUserLeagueRank(
  userId: string,
  leagueId: string,
): Promise<number | null> {
  const rows = await getLeagueLeaderboard(leagueId, userId);
  return rows.find((r) => r.userId === userId)?.rank ?? null;
}

/** Primera liga del usuario y su puesto en ella (para el shell). */
export async function getFirstLeagueInfo(userId: string): Promise<{
  rank: number | null;
  leagueName: string | null;
  leagueId: string | null;
}> {
  const membership = await prisma.miniLeagueMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    include: { miniLeague: { select: { id: true, name: true } } },
  });
  if (!membership) return { rank: null, leagueName: null, leagueId: null };

  const rank = await getUserLeagueRank(userId, membership.miniLeagueId);
  return {
    rank,
    leagueName: membership.miniLeague.name,
    leagueId: membership.miniLeagueId,
  };
}

/** Ligas a las que pertenece el usuario. */
export async function getUserLeagues(userId: string): Promise<LeagueVM[]> {
  const memberships = await prisma.miniLeagueMember.findMany({
    where: { userId },
    include: {
      miniLeague: {
        include: { _count: { select: { members: true } } },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map(({ miniLeague }) => ({
    id: miniLeague.id,
    name: miniLeague.name,
    inviteCode: miniLeague.inviteCode,
    memberCount: miniLeague._count.members,
    isOwner: miniLeague.createdById === userId,
  }));
}

/** ¿El usuario pertenece a al menos una liga? */
export async function userHasLeague(userId: string): Promise<boolean> {
  const count = await prisma.miniLeagueMember.count({ where: { userId } });
  return count > 0;
}

export type UserGlobalStats = {
  totalPoints: number;
  predictionsCount: number;
  exactCount: number;
  accuracy: number;
  currentStreak: number;
  bestStreak: number;
};

/** Estadísticas globales del usuario a través de todas las ligas (deduplicadas por partido). */
export async function getUserGlobalStats(userId: string): Promise<UserGlobalStats> {
  const [finishedMatches, predictions] = await Promise.all([
    prisma.match.findMany({
      where: { status: "FINISHED" },
      orderBy: { kickoffAt: "asc" },
      select: { id: true, stage: true },
    }),
    prisma.prediction.findMany({
      where: { userId },
      select: { matchId: true, points: true, exact: true },
    }),
  ]);

  const finishedOrder = finishedMatches.map((m) => m.id);
  const finishedSet = new Set(finishedOrder);

  const stageByMatch = new Map(finishedMatches.map((m) => [m.id, m.stage]));

  // Deduplicar por partido: quedarse con la predicción con más puntos.
  const byMatch = new Map<string, { matchId: string; points: number | null; exact: boolean }>();
  for (const p of predictions) {
    if (!finishedSet.has(p.matchId)) continue;
    const existing = byMatch.get(p.matchId);
    if (!existing || (p.points ?? 0) > (existing.points ?? 0)) {
      byMatch.set(p.matchId, p);
    }
  }

  const finished = [...byMatch.values()];
  const totalPoints = finished.reduce((s, p) => s + (p.points ?? 0), 0);
  const exactCount = finished.filter((p) => p.exact).length;
  const predictionsCount = finished.length;
  // Precisión = puntos / máximo puntuable (ver getLeagueLeaderboard).
  const maxPossible = finished.reduce(
    (s, p) => s + maxPointsFor(stageByMatch.get(p.matchId)!),
    0,
  );
  const accuracy =
    maxPossible > 0 ? Math.round((totalPoints / maxPossible) * 1000) / 10 : 0;

  let bestStreak = 0;
  let runningStreak = 0;
  let currentStreak = 0;
  for (const matchId of finishedOrder) {
    const p = byMatch.get(matchId);
    if (!p) continue; // sin predicción = no rompe racha
    if ((p.points ?? 0) > 0) {
      runningStreak++;
      bestStreak = Math.max(bestStreak, runningStreak);
      currentStreak = runningStreak;
    } else {
      runningStreak = 0;
      currentStreak = 0;
    }
  }

  return { totalPoints, predictionsCount, exactCount, accuracy, currentStreak, bestStreak };
}

/** Logros del usuario: catálogo completo con estado desbloqueado. */
export async function getUnlockedAchievements(
  userId: string,
): Promise<Set<AchievementType>> {
  const rows = await prisma.achievement.findMany({
    where: { userId },
    select: { type: true },
  });
  return new Set(rows.map((r) => r.type));
}

export type LeagueAchievements = {
  leagueId: string;
  leagueName: string;
  unlocked: Set<AchievementType>;
};

/** Logros del usuario agrupados por liga. */
export async function getAchievementsByLeague(
  userId: string,
): Promise<LeagueAchievements[]> {
  const rows = await prisma.achievement.findMany({
    where: { userId },
    select: {
      type: true,
      leagueId: true,
      league: { select: { name: true } },
    },
    orderBy: { unlockedAt: "asc" },
  });

  const byLeague = new Map<string, LeagueAchievements>();
  for (const r of rows) {
    if (!byLeague.has(r.leagueId)) {
      byLeague.set(r.leagueId, {
        leagueId: r.leagueId,
        leagueName: r.league.name,
        unlocked: new Set(),
      });
    }
    byLeague.get(r.leagueId)!.unlocked.add(r.type);
  }
  return [...byLeague.values()];
}
