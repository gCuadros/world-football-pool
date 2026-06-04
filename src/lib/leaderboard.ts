import "server-only";

import { cacheTag, cacheLife } from "next/cache";

import { prisma } from "@/lib/prisma";
import { leagueTag } from "@/lib/cache-tags";
import type { AchievementType } from "@prisma/client";

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
  points: number;
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
 * Clasificación de una liga calculada en tiempo real desde predicciones.
 * Cacheada por liga — se invalida cuando un partido de esa liga se puntúa.
 */
export async function getLeagueLeaderboard(
  leagueId: string,
  currentUserId: string,
): Promise<LeaderboardRow[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(leagueTag(leagueId));

  const [members, finishedMatches, predictions] = await Promise.all([
    prisma.miniLeagueMember.findMany({
      where: { miniLeagueId: leagueId },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
    }),
    prisma.prediction.findMany({
      where: { leagueId },
      select: { userId: true, matchId: true, points: true },
    }),
  ]);

  const finishedOrder = finishedMatches.map((m) => m.id);
  const finishedSet = new Set(finishedOrder);

  const predsByUser = new Map<string, { matchId: string; points: number | null }[]>();
  for (const p of predictions) {
    const arr = predsByUser.get(p.userId) ?? [];
    arr.push(p);
    predsByUser.set(p.userId, arr);
  }

  const rows: LeaderboardRow[] = members.map(({ user }) => {
    const userPreds = predsByUser.get(user.id) ?? [];
    const finished = userPreds.filter((p) => finishedSet.has(p.matchId));

    const totalPoints = finished.reduce((s, p) => s + (p.points ?? 0), 0);
    const exactCount = finished.filter((p) => p.points === 3).length;
    const correctCount = finished.filter((p) => p.points === 1).length;
    const predictionsCount = finished.length;
    const accuracy =
      predictionsCount > 0
        ? Math.round(((exactCount + correctCount) / predictionsCount) * 1000) / 10
        : 0;

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
      points: totalPoints,
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
