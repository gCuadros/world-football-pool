import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/scoring";
import { leagueTag } from "@/lib/cache-tags";
import { AchievementType } from "@prisma/client";

/**
 * Recalcula los puntos de todas las predicciones de un partido terminado
 * (en todas las ligas) y revalida el caché de cada liga afectada.
 */
export async function recalculateMatchPoints(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (
    !match ||
    match.status !== "FINISHED" ||
    match.homeScore === null ||
    match.awayScore === null
  ) {
    return;
  }

  const preds = await prisma.prediction.findMany({ where: { matchId } });

  await Promise.all(
    preds.map((p) =>
      prisma.prediction.update({
        where: { id: p.id },
        data: { points: calculatePoints(p, match) },
      }),
    ),
  );

  // Invalida el caché de cada liga que tiene predicciones en este partido.
  const leagueIds = [...new Set(preds.map((p) => p.leagueId))];
  for (const id of leagueIds) {
    revalidateTag(leagueTag(id), "max");
  }
}

/**
 * Recalcula logros globales del usuario (racha, exactitud…).
 * Los logros siguen siendo por usuario, no por liga, para simplificar.
 */
export async function rebuildAchievements(userId: string): Promise<void> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    orderBy: { kickoffAt: "asc" },
    select: { id: true },
  });
  const finishedOrder = finishedMatches.map((m) => m.id);
  const finishedSet = new Set(finishedOrder);

  const preds = await prisma.prediction.findMany({
    where: { userId },
    select: { matchId: true, points: true },
  });
  const finished = preds.filter((p) => finishedSet.has(p.matchId));

  const exactCount = finished.filter((p) => p.points === 3).length;
  const predictionsCount = finished.length;

  let bestStreak = 0;
  let runningStreak = 0;
  const byMatch = new Map(finished.map((p) => [p.matchId, p]));
  for (const matchId of finishedOrder) {
    const p = byMatch.get(matchId);
    if (p && (p.points ?? 0) > 0) {
      runningStreak++;
      bestStreak = Math.max(bestStreak, runningStreak);
    } else if (p) {
      runningStreak = 0;
    }
  }

  // Puesto más bajo entre todas las ligas del usuario.
  const memberships = await prisma.miniLeagueMember.findMany({
    where: { userId },
    select: { miniLeagueId: true },
  });

  const types: AchievementType[] = [];
  if (exactCount >= 1) types.push(AchievementType.PERFECT_SCORE);
  if (bestStreak >= 3) types.push(AchievementType.STREAK_3);
  if (bestStreak >= 5) types.push(AchievementType.STREAK_5);
  if (bestStreak >= 10) types.push(AchievementType.STREAK_10);
  if (predictionsCount >= 48 && memberships.length > 0)
    types.push(AchievementType.ALL_GROUP_STAGE);

  if (types.length > 0) {
    await prisma.achievement.createMany({
      data: types.map((type) => ({ userId, type })),
      skipDuplicates: true,
    });
  }
}

/**
 * Finaliza un partido con un marcador, recalcula puntos y logros de
 * todos los usuarios con predicciones en ese partido.
 */
export async function finalizeMatch(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  await prisma.match.update({
    where: { id: matchId },
    data: { homeScore, awayScore, status: "FINISHED", liveMinute: null },
  });
  await recalculateMatchPoints(matchId);

  const affectedUsers = await prisma.prediction.findMany({
    where: { matchId },
    select: { userId: true },
    distinct: ["userId"],
  });
  await Promise.all(affectedUsers.map((u) => rebuildAchievements(u.userId)));
}
