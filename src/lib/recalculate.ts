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
 * Recalcula los logros de un usuario DENTRO DE UNA LIGA concreta.
 * Los logros son por liga: el mismo logro puede ganarse en ligas distintas.
 */
export async function rebuildAchievements(
  userId: string,
  leagueId: string,
): Promise<void> {
  const finishedMatches = await prisma.match.findMany({
    where: { status: "FINISHED" },
    orderBy: { kickoffAt: "asc" },
    select: { id: true, stage: true },
  });
  const finishedOrder = finishedMatches.map((m) => m.id);
  const finishedSet = new Set(finishedOrder);

  // Solo predicciones de ESTA liga.
  const preds = await prisma.prediction.findMany({
    where: { userId, leagueId },
    select: { matchId: true, points: true },
  });
  const finished = preds.filter((p) => finishedSet.has(p.matchId));

  const exactCount = finished.filter((p) => p.points === 3).length;

  // Racha (ordenada por los partidos finalizados, en orden).
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

  // Ranking en esta liga.
  const allPreds = await prisma.prediction.findMany({
    where: { leagueId, matchId: { in: [...finishedSet] } },
    select: { userId: true, points: true },
  });
  const pointsByUser = new Map<string, number>();
  for (const pred of allPreds) {
    pointsByUser.set(
      pred.userId,
      (pointsByUser.get(pred.userId) ?? 0) + (pred.points ?? 0),
    );
  }
  const userPoints = pointsByUser.get(userId) ?? 0;
  const rank =
    [...pointsByUser.values()].filter((pts) => pts > userPoints).length + 1;
  const totalInLeague = pointsByUser.size;

  // Fase de grupos completa: ≥48 predicciones en partidos de grupos.
  const groupMatchIds = new Set(
    finishedMatches
      .filter((m) => m.stage === "GROUP_STAGE")
      .map((m) => m.id),
  );
  const groupPredCount = finished.filter((p) =>
    groupMatchIds.has(p.matchId),
  ).length;

  const types: AchievementType[] = [];
  if (exactCount >= 1) types.push(AchievementType.PERFECT_SCORE);
  if (bestStreak >= 3) types.push(AchievementType.STREAK_3);
  if (bestStreak >= 5) types.push(AchievementType.STREAK_5);
  if (bestStreak >= 10) types.push(AchievementType.STREAK_10);
  if (totalInLeague >= 10 && rank <= 10) types.push(AchievementType.TOP_10);
  if (totalInLeague >= 3 && rank <= 3) types.push(AchievementType.TOP_3);
  if (groupPredCount >= 48) types.push(AchievementType.ALL_GROUP_STAGE);
  if (rank === 1 && totalInLeague >= 3) types.push(AchievementType.CHAMPION_CALL);

  if (types.length > 0) {
    await prisma.achievement.createMany({
      data: types.map((type) => ({ userId, leagueId, type })),
      skipDuplicates: true,
    });
  }
}

/**
 * Finaliza un partido con un marcador, recalcula puntos y logros de
 * todos los usuarios con predicciones en ese partido (por liga).
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

  // Recalcula logros por liga: una entrada (userId, leagueId) por predicción.
  const affectedPairs = await prisma.prediction.findMany({
    where: { matchId },
    select: { userId: true, leagueId: true },
    distinct: ["userId", "leagueId"],
  });
  await Promise.all(
    affectedPairs.map((p) => rebuildAchievements(p.userId, p.leagueId)),
  );
}
