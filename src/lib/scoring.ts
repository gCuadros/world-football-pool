// Motor de puntuación de la Quiniela Mundial 2026.
// Reglas: marcador exacto = 3 pts · resultado correcto (1X2) = 1 pt · fallo = 0.

export type Result = "HOME" | "DRAW" | "AWAY";

export function getResult(homeScore: number, awayScore: number): Result {
  if (homeScore > awayScore) return "HOME";
  if (homeScore < awayScore) return "AWAY";
  return "DRAW";
}

export interface PredictionScores {
  homeScore: number;
  awayScore: number;
}

export interface MatchScores {
  homeScore: number | null;
  awayScore: number | null;
}

/**
 * Calcula los puntos de una predicción frente al marcador real de un partido.
 * Devuelve null si el partido aún no tiene marcador (no terminado).
 */
export function calculatePoints(
  prediction: PredictionScores,
  match: MatchScores,
): number | null {
  if (match.homeScore === null || match.awayScore === null) return null;

  // Marcador exacto.
  if (
    prediction.homeScore === match.homeScore &&
    prediction.awayScore === match.awayScore
  ) {
    return 3;
  }

  // Resultado correcto (victoria local / empate / victoria visitante).
  if (
    getResult(prediction.homeScore, prediction.awayScore) ===
    getResult(match.homeScore, match.awayScore)
  ) {
    return 1;
  }

  return 0;
}

// Minutos antes del kickoff en los que se cierran las predicciones.
export const PREDICTION_LOCK_MINUTES = 15;

/** ¿Están cerradas las predicciones para este partido? (deadline de 15 min). */
export function isPredictionLocked(kickoffAt: Date, now: Date = new Date()): boolean {
  const minutesUntilKickoff = (kickoffAt.getTime() - now.getTime()) / 60000;
  return minutesUntilKickoff <= PREDICTION_LOCK_MINUTES;
}

/** Segundos restantes hasta el cierre de predicciones (0 si ya cerró). */
export function secondsUntilLock(kickoffAt: Date, now: Date = new Date()): number {
  const lockAt = kickoffAt.getTime() - PREDICTION_LOCK_MINUTES * 60000;
  return Math.max(0, Math.floor((lockAt - now.getTime()) / 1000));
}
