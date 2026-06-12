// Motor de puntuación — Quiniela Mundial 2026.
// Sistema acumulativo: 1X2 (1pt) + diferencia (2pt) + exacto (2pt) + quién pasa (3pt, solo eliminatorias).
// total = base × multiplicador de fase.

import type { Stage, Side } from "@prisma/client";

export type Result = "HOME" | "DRAW" | "AWAY";

export function getResult(homeScore: number, awayScore: number): Result {
  if (homeScore > awayScore) return "HOME";
  if (homeScore < awayScore) return "AWAY";
  return "DRAW";
}

export const MULTIPLIERS: Record<Stage, number> = {
  GROUP_STAGE:   1,
  ROUND_OF_32:   1.5,
  ROUND_OF_16:   1.75,
  QUARTER_FINAL: 2,
  SEMI_FINAL:    2.5,
  THIRD_PLACE:   2.5,
  FINAL:         3,
  FRIENDLY:      1,
};

const KNOCKOUT_STAGES = new Set<Stage>([
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

export type ScoreBreakdown = {
  total: number;
  exact: boolean;
  hit1x2: boolean;
  hitDiff: boolean;
  hitAdvance: boolean;
  base: number;
  multiplier: number;
};

/**
 * Calcula el desglose de puntos de una predicción.
 * Devuelve null si el partido aún no tiene marcador final.
 */
export function scorePrediction(
  pred: { homeScore: number; awayScore: number; advancePick?: Side | null },
  match: { homeScore: number | null; awayScore: number | null; stage: Stage; advanced?: Side | null },
): ScoreBreakdown | null {
  if (match.homeScore === null || match.awayScore === null) return null;

  const predResult = getResult(pred.homeScore, pred.awayScore);
  const matchResult = getResult(match.homeScore, match.awayScore);

  const hit1x2 = predResult === matchResult;
  const predDiff = pred.homeScore - pred.awayScore;
  const matchDiff = match.homeScore - match.awayScore;
  const hitDiff = predDiff === matchDiff;
  const hitExact =
    pred.homeScore === match.homeScore && pred.awayScore === match.awayScore;

  let base = 0;
  if (hit1x2) base += 1;
  if (hitDiff) base += 2;
  if (hitExact) base += 2;

  const isKnockout = KNOCKOUT_STAGES.has(match.stage);
  const hitAdvance =
    isKnockout &&
    pred.advancePick != null &&
    match.advanced != null &&
    pred.advancePick === match.advanced;
  if (hitAdvance) base += 3;

  const multiplier = MULTIPLIERS[match.stage];
  const total = base * multiplier;

  return { total, exact: hitExact, hit1x2, hitDiff, hitAdvance, base, multiplier };
}

// Minutos antes del kickoff en los que se cierran las predicciones.
export const PREDICTION_LOCK_MINUTES = 15;

export function isPredictionLocked(kickoffAt: Date, now: Date = new Date()): boolean {
  const minutesUntilKickoff = (kickoffAt.getTime() - now.getTime()) / 60000;
  return minutesUntilKickoff <= PREDICTION_LOCK_MINUTES;
}

export function secondsUntilLock(kickoffAt: Date, now: Date = new Date()): number {
  const lockAt = kickoffAt.getTime() - PREDICTION_LOCK_MINUTES * 60000;
  return Math.max(0, Math.floor((lockAt - now.getTime()) / 1000));
}

/**
 * Máximo puntuable de un partido: pleno absoluto (1X2 + diferencia + exacto,
 * más quién pasa en eliminatorias) × multiplicador de fase. Es el denominador
 * de la precisión: cuántos puntos rascaste de los que había en juego.
 */
export function maxPointsFor(stage: Stage): number {
  const base = KNOCKOUT_STAGES.has(stage) ? 8 : 5;
  return base * MULTIPLIERS[stage];
}
