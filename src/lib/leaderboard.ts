import "server-only";

import { cacheTag, cacheLife } from "next/cache";

import { prisma } from "@/lib/prisma";
import { TAGS } from "@/lib/cache-tags";
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
  currentStreak: number;
  trend: number; // previousRank − rank (positivo = ha subido)
  isCurrentUser: boolean;
};

/** Filas de la clasificación (compartidas) — CACHEADAS (`use cache`), sin marca de usuario. */
async function getLeaderboardRows(): Promise<
  Omit<LeaderboardRow, "isCurrentUser">[]
> {
  "use cache";
  cacheLife("minutes");
  cacheTag(TAGS.leaderboard);

  const snaps = await prisma.leaderboardSnapshot.findMany({
    orderBy: { rank: "asc" },
    include: { user: { select: { name: true, email: true } } },
  });
  return snaps.map((s) => ({
    rank: s.rank,
    userId: s.userId,
    name: s.user.name ?? s.user.email,
    initials: initials(s.user.name, s.user.email),
    points: s.totalPoints,
    accuracy: s.accuracy,
    predictionsCount: s.predictionsCount,
    currentStreak: s.currentStreak,
    trend: s.previousRank - s.rank,
  }));
}

/** Clasificación general, ordenada por puesto (marca al usuario actual). */
export async function getLeaderboard(
  currentUserId: string,
): Promise<LeaderboardRow[]> {
  const rows = await getLeaderboardRows();
  return rows.map((r) => ({ ...r, isCurrentUser: r.userId === currentUserId }));
}

export type RankInfo = {
  rank: number | null;
  totalPlayers: number;
  points: number;
  accuracy: number;
  predictionsCount: number;
  exactCount: number;
  currentStreak: number;
  bestStreak: number;
  trend: number;
  percentile: number | null; // top X%
};

/** Datos del banner de ranking del usuario. */
export async function getRankInfo(userId: string): Promise<RankInfo> {
  const [snap, totalPlayers] = await Promise.all([
    prisma.leaderboardSnapshot.findUnique({ where: { userId } }),
    prisma.leaderboardSnapshot.count(),
  ]);

  const rank = snap?.rank ?? null;
  return {
    rank,
    totalPlayers,
    points: snap?.totalPoints ?? 0,
    accuracy: snap?.accuracy ?? 0,
    predictionsCount: snap?.predictionsCount ?? 0,
    exactCount: snap?.exactCount ?? 0,
    currentStreak: snap?.currentStreak ?? 0,
    bestStreak: snap?.bestStreak ?? 0,
    trend: snap ? snap.previousRank - snap.rank : 0,
    percentile:
      rank && totalPlayers > 0
        ? Math.max(1, Math.round((rank / totalPlayers) * 100))
        : null,
  };
}

export type MiniLeagueVM = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
  isOwner: boolean;
  rows: LeaderboardRow[];
};

/** Mini-ligas del usuario con su ranking interno (por puntos). */
export async function getMiniLeaguesForUser(
  userId: string,
): Promise<MiniLeagueVM[]> {
  const memberships = await prisma.miniLeagueMember.findMany({
    where: { userId },
    include: {
      miniLeague: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  leaderboardSnapshot: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return memberships.map(({ miniLeague }) => {
    const rows: LeaderboardRow[] = miniLeague.members
      .map((m) => ({
        userId: m.user.id,
        name: m.user.name ?? m.user.email,
        initials: initials(m.user.name, m.user.email),
        points: m.user.leaderboardSnapshot?.totalPoints ?? 0,
        accuracy: m.user.leaderboardSnapshot?.accuracy ?? 0,
        predictionsCount: m.user.leaderboardSnapshot?.predictionsCount ?? 0,
        currentStreak: m.user.leaderboardSnapshot?.currentStreak ?? 0,
        trend: 0,
        isCurrentUser: m.user.id === userId,
        rank: 0,
      }))
      .sort((a, b) => b.points - a.points || b.accuracy - a.accuracy)
      .map((row, i) => ({ ...row, rank: i + 1 }));

    return {
      id: miniLeague.id,
      name: miniLeague.name,
      inviteCode: miniLeague.inviteCode,
      memberCount: miniLeague.members.length,
      isOwner: miniLeague.createdById === userId,
      rows,
    };
  });
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
