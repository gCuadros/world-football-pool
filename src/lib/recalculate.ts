import { prisma } from "@/lib/prisma";
import { calculatePoints } from "@/lib/scoring";
import { AchievementType } from "@prisma/client";

/**
 * Recalcula los puntos de todas las predicciones de un partido terminado.
 * No hace nada si el partido no está FINISHED o no tiene marcador.
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
}

/**
 * Reconstruye toda la clasificación (LeaderboardSnapshot) y los logros a partir
 * de las predicciones puntuadas. Preserva el rank anterior como previousRank
 * para poder mostrar la tendencia. Idempotente.
 */
export async function rebuildLeaderboardAndAchievements(): Promise<void> {
  const [users, finishedMatches] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
    }),
  ]);
  const finishedOrder = finishedMatches.map((m) => m.id);
  const finishedSet = new Set(finishedOrder);

  type Agg = {
    userId: string;
    totalPoints: number;
    predictionsCount: number;
    exactCount: number;
    correctCount: number;
    accuracy: number;
    currentStreak: number;
    bestStreak: number;
  };

  const aggregates: Agg[] = [];

  for (const user of users) {
    const preds = await prisma.prediction.findMany({
      where: { userId: user.id },
    });
    const finished = preds.filter((p) => finishedSet.has(p.matchId));
    const totalPoints = finished.reduce((s, p) => s + (p.points ?? 0), 0);
    const exactCount = finished.filter((p) => p.points === 3).length;
    const correctCount = finished.filter((p) => p.points === 1).length;
    const predictionsCount = finished.length;
    const accuracy =
      predictionsCount > 0
        ? Math.round(((exactCount + correctCount) / predictionsCount) * 1000) / 10
        : 0;

    // Rachas sobre partidos terminados, en orden cronológico.
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

    aggregates.push({
      userId: user.id,
      totalPoints,
      predictionsCount,
      exactCount,
      correctCount,
      accuracy,
      currentStreak,
      bestStreak,
    });
  }

  aggregates.sort(
    (a, b) => b.totalPoints - a.totalPoints || b.accuracy - a.accuracy,
  );

  // Rank previo (para la tendencia), leído antes de sobrescribir.
  const existing = await prisma.leaderboardSnapshot.findMany({
    select: { userId: true, rank: true },
  });
  const prevRank = new Map(existing.map((s) => [s.userId, s.rank]));

  for (let i = 0; i < aggregates.length; i++) {
    const a = aggregates[i];
    const rank = i + 1;
    await prisma.leaderboardSnapshot.upsert({
      where: { userId: a.userId },
      create: {
        userId: a.userId,
        totalPoints: a.totalPoints,
        predictionsCount: a.predictionsCount,
        exactCount: a.exactCount,
        correctCount: a.correctCount,
        accuracy: a.accuracy,
        currentStreak: a.currentStreak,
        bestStreak: a.bestStreak,
        rank,
        previousRank: prevRank.get(a.userId) ?? rank,
      },
      update: {
        totalPoints: a.totalPoints,
        predictionsCount: a.predictionsCount,
        exactCount: a.exactCount,
        correctCount: a.correctCount,
        accuracy: a.accuracy,
        currentStreak: a.currentStreak,
        bestStreak: a.bestStreak,
        rank,
        previousRank: prevRank.get(a.userId) ?? rank,
      },
    });

    // Logros (solo añadir los que falten; @@unique evita duplicados).
    const types: AchievementType[] = [];
    if (a.exactCount >= 1) types.push(AchievementType.PERFECT_SCORE);
    if (a.bestStreak >= 3) types.push(AchievementType.STREAK_3);
    if (a.bestStreak >= 5) types.push(AchievementType.STREAK_5);
    if (a.bestStreak >= 10) types.push(AchievementType.STREAK_10);
    if (rank <= 3) types.push(AchievementType.TOP_3);
    if (rank <= 10) types.push(AchievementType.TOP_10);
    if (types.length > 0) {
      await prisma.achievement.createMany({
        data: types.map((type) => ({ userId: a.userId, type })),
        skipDuplicates: true,
      });
    }
  }
}

/**
 * Finaliza un partido con un marcador y recalcula puntos.
 * (El rebuild de la clasificación lo hace quien orquesta, una vez al final.)
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
}
