import "server-only";

import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { getLeagueLeaderboard } from "@/lib/leaderboard";
import { getLiveFixtures } from "@/lib/providers/api-football";

function ordinal(n: number): string {
  return `${n}.º`;
}

/**
 * Notifica el resultado a quienes predijeron un partido recién finalizado.
 * Idempotente: no repite si ya existe una notificación MATCH_RESULT para ese
 * partido y usuario/liga.
 */
export async function notifyMatchResult(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (
    !match ||
    match.status !== "FINISHED" ||
    match.homeScore === null ||
    match.awayScore === null
  ) {
    return;
  }

  const preds = await prisma.prediction.findMany({
    where: { matchId },
    select: {
      userId: true,
      leagueId: true,
      points: true,
      league: { select: { name: true } },
    },
  });
  if (preds.length === 0) return;

  // Dedupe: pares (userId:leagueId) ya notificados para este partido.
  const existing = await prisma.notification.findMany({
    where: { matchId, type: "MATCH_RESULT" },
    select: { userId: true, leagueId: true },
  });
  const done = new Set(existing.map((e) => `${e.userId}:${e.leagueId}`));

  // Clasificación por liga (cacheada) para incluir la posición actual.
  const leagueIds = [...new Set(preds.map((p) => p.leagueId))];
  const ranks = new Map<string, Map<string, number>>();
  await Promise.all(
    leagueIds.map(async (lid) => {
      const rows = await getLeagueLeaderboard(lid, "");
      ranks.set(lid, new Map(rows.map((r) => [r.userId, r.rank])));
    }),
  );

  const scoreline = `${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`;

  const inputs = preds
    .filter((p) => !done.has(`${p.userId}:${p.leagueId}`))
    .map((p) => {
      const pts = p.points ?? 0;
      const rank = ranks.get(p.leagueId)?.get(p.userId);
      const posTxt = rank ? ` · vas ${ordinal(rank)} en ${p.league.name}` : "";
      return {
        userId: p.userId,
        type: "MATCH_RESULT" as const,
        title:
          pts > 0
            ? `+${pts} ${pts === 1 ? "punto" : "puntos"} · ${scoreline}`
            : `Sin puntos · ${scoreline}`,
        body: `${p.league.name}${posTxt}`,
        link: `/liga/${p.leagueId}`,
        matchId,
        leagueId: p.leagueId,
      };
    });

  await createNotifications(inputs);
}

/**
 * Sondea los partidos en vivo (1 sola llamada `live=all`), actualiza marcador/
 * minuto en BD y notifica goles a quienes predijeron ese partido (1 por usuario).
 * Devuelve cuántos goles se detectaron. No llama a la API si no se le pide.
 */
export async function pollLiveGoals(): Promise<{ goals: number; live: number }> {
  const live = await getLiveFixtures();
  if (live.length === 0) return { goals: 0, live: 0 };

  const externalIds = live.map((f) => f.externalId);
  const matches = await prisma.match.findMany({
    where: { externalId: { in: externalIds } },
  });
  const byExternal = new Map(matches.map((m) => [m.externalId, m]));

  let goals = 0;

  for (const f of live) {
    const m = byExternal.get(f.externalId);
    if (!m) continue;

    const prevHome = m.homeScore ?? 0;
    const prevAway = m.awayScore ?? 0;
    const scored = f.homeScore + f.awayScore - (prevHome + prevAway);

    // Actualiza marcador/estado/minuto en vivo.
    await prisma.match.update({
      where: { id: m.id },
      data: {
        homeScore: f.homeScore,
        awayScore: f.awayScore,
        status: "LIVE",
        liveMinute: f.minute,
      },
    });

    if (scored > 0 && m.status !== "UPCOMING") {
      goals += scored;
      const predictors = await prisma.prediction.findMany({
        where: { matchId: m.id },
        select: { userId: true },
        distinct: ["userId"],
      });
      const scoreline = `${m.homeTeam} ${f.homeScore}-${f.awayScore} ${m.awayTeam}`;
      await createNotifications(
        predictors.map((p) => ({
          userId: p.userId,
          type: "LIVE_GOAL" as const,
          title: `⚽ ¡Gol! ${scoreline}`,
          body: f.minute ? `Minuto ${f.minute}'` : "En directo",
          link: "/resultados",
          matchId: m.id,
        })),
      );
    }
  }

  return { goals, live: live.length };
}

/**
 * Recordatorios de predicción: partidos próximos (< horas) que el usuario no ha
 * predicho en ninguna de sus ligas. Dedupe por (userId, matchId).
 */
export async function generatePredictionReminders(
  withinHours = 6,
): Promise<number> {
  const now = new Date();
  const until = new Date(now.getTime() + withinHours * 3_600_000);

  const upcoming = await prisma.match.findMany({
    where: { status: "UPCOMING", kickoffAt: { gt: now, lte: until } },
    select: { id: true, homeTeam: true, awayTeam: true },
  });
  if (upcoming.length === 0) return 0;

  // Usuarios que pertenecen a alguna liga.
  const members = await prisma.miniLeagueMember.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });
  const leagueUserIds = members.map((m) => m.userId);
  if (leagueUserIds.length === 0) return 0;

  const inputs = [];

  for (const match of upcoming) {
    // Usuarios que ya predijeron este partido (en cualquier liga).
    const predicted = await prisma.prediction.findMany({
      where: { matchId: match.id },
      select: { userId: true },
      distinct: ["userId"],
    });
    const predictedSet = new Set(predicted.map((p) => p.userId));

    // Usuarios ya avisados de este partido.
    const reminded = await prisma.notification.findMany({
      where: { matchId: match.id, type: "PREDICTION_REMINDER" },
      select: { userId: true },
    });
    const remindedSet = new Set(reminded.map((r) => r.userId));

    for (const userId of leagueUserIds) {
      if (predictedSet.has(userId) || remindedSet.has(userId)) continue;
      inputs.push({
        userId,
        type: "PREDICTION_REMINDER" as const,
        title: `Predice ${match.homeTeam} vs ${match.awayTeam}`,
        body: "Cierra pronto. ¡No te quedes sin puntos!",
        link: "/ligas",
        matchId: match.id,
      });
    }
  }

  await createNotifications(inputs);
  return inputs.length;
}
