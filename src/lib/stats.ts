import "server-only";

import { prisma } from "@/lib/prisma";
import type { Stage } from "@prisma/client";

export type StageStat = {
  stage: Stage;
  total: number;
  hits: number;
  exact: number;
  accuracy: number;
};

export type BestPrediction = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  score: string;
  points: number;
};

export type UserStatsDetailed = {
  totalPoints: number;
  predictionsCount: number;
  exact: number;
  correct: number;
  missed: number;
  accuracy: number;
  bestStreak: number;
  byStage: StageStat[];
  best: BestPrediction[];
};

const STAGE_ORDER: Stage[] = [
  "GROUP_STAGE",
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

/** Estadísticas detalladas del usuario en una liga sobre sus predicciones ya puntuadas. */
export async function getUserStatsDetailed(
  userId: string,
  leagueId: string,
): Promise<UserStatsDetailed> {
  const [preds, finishedMatches] = await Promise.all([
    prisma.prediction.findMany({
      where: { userId, leagueId, match: { status: "FINISHED" } },
      include: { match: true },
    }),
    prisma.match.findMany({
      where: { status: "FINISHED" },
      orderBy: { kickoffAt: "asc" },
      select: { id: true },
    }),
  ]);

  let exact = 0;
  let correct = 0;
  let missed = 0;
  const stageMap = new Map<Stage, { total: number; hits: number; exact: number }>();

  for (const p of preds) {
    const pts = p.points ?? 0;
    if (pts === 3) exact++;
    else if (pts === 1) correct++;
    else missed++;

    const s = stageMap.get(p.match.stage) ?? { total: 0, hits: 0, exact: 0 };
    s.total++;
    if (pts > 0) s.hits++;
    if (pts === 3) s.exact++;
    stageMap.set(p.match.stage, s);
  }

  const byStage: StageStat[] = STAGE_ORDER.filter((s) => stageMap.has(s)).map(
    (stage) => {
      const s = stageMap.get(stage)!;
      return {
        stage,
        total: s.total,
        hits: s.hits,
        exact: s.exact,
        accuracy: s.total > 0 ? Math.round((s.hits / s.total) * 100) : 0,
      };
    },
  );

  const best: BestPrediction[] = preds
    .filter((p) => p.points === 3)
    .slice(0, 6)
    .map((p) => ({
      matchId: p.matchId,
      homeTeam: p.match.homeTeam,
      awayTeam: p.match.awayTeam,
      homeFlag: p.match.homeFlag,
      awayFlag: p.match.awayFlag,
      score: `${p.match.homeScore}-${p.match.awayScore}`,
      points: 3,
    }));

  // Racha mejor (sobre los partidos terminados del torneo en orden)
  const finishedOrder = finishedMatches.map((m) => m.id);
  const byMatch = new Map(preds.map((p) => [p.matchId, p]));
  let bestStreak = 0;
  let runningStreak = 0;
  for (const matchId of finishedOrder) {
    const p = byMatch.get(matchId);
    if (p && (p.points ?? 0) > 0) {
      runningStreak++;
      bestStreak = Math.max(bestStreak, runningStreak);
    } else if (p) {
      runningStreak = 0;
    }
  }

  const predictionsCount = preds.length;
  return {
    totalPoints: exact * 3 + correct,
    predictionsCount,
    exact,
    correct,
    missed,
    accuracy:
      predictionsCount > 0
        ? Math.round(((exact + correct) / predictionsCount) * 1000) / 10
        : 0,
    bestStreak,
    byStage,
    best,
  };
}
