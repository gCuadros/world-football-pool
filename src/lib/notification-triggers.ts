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
        teams: [match.homeTeam, match.awayTeam],
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
  // Solo el Mundial (liga por defecto): una única llamada por sondeo.
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

    // Mismo tag por partido: el arranque y cada gol llegan como UNA sola
    // notificación que se va reemplazando en la pantalla de bloqueo (marcador
    // en vivo), en lugar de apilarse una por gol.
    const matchTag = `match-${m.id}`;
    const kickedOff = m.status === "UPCOMING"; // estaba por jugarse, ya rueda
    const scoredGoal = scored > 0 && !kickedOff;

    if (kickedOff || scoredGoal) {
      if (scoredGoal) goals += scored;
      const predictors = await prisma.prediction.findMany({
        where: { matchId: m.id },
        select: { userId: true },
        distinct: ["userId"],
      });
      const scoreline = `${m.homeTeam} ${f.homeScore}-${f.awayScore} ${m.awayTeam}`;
      const event = kickedOff
        ? {
            type: "MATCH_STARTING" as const,
            title: `🟢 Empieza ${m.homeTeam} – ${m.awayTeam}`,
            body: "¡Rueda el balón!",
          }
        : {
            type: "LIVE_GOAL" as const,
            title: `⚽ ¡Gol! ${scoreline}`,
            body: f.minute ? `Minuto ${f.minute}'` : "En directo",
          };
      await createNotifications(
        predictors.map((p) => ({
          userId: p.userId,
          type: event.type,
          title: event.title,
          body: event.body,
          link: "/resultados",
          matchId: m.id,
          teams: [m.homeTeam, m.awayTeam],
          pushTag: matchTag,
          renotify: true,
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
        teams: [match.homeTeam, match.awayTeam],
      });
    }
  }

  await createNotifications(inputs);
  return inputs.length;
}

/**
 * Aviso pre-partido: ~20 min antes del kickoff para usuarios en ligas.
 * Si `notifyMatchStartAll=false` (defecto), solo avisa a quien no ha predicho.
 * Si `notifyMatchStartAll=true`, avisa aunque ya haya predicho.
 * Dedupe por (userId, matchId) de tipo MATCH_STARTING.
 */
export async function generateMatchStartingAlerts(
  withinMinutes = 20,
): Promise<number> {
  const now = new Date();
  const until = new Date(now.getTime() + withinMinutes * 60_000);

  const upcoming = await prisma.match.findMany({
    where: { status: "UPCOMING", kickoffAt: { gt: now, lte: until } },
    select: { id: true, homeTeam: true, awayTeam: true },
  });
  if (upcoming.length === 0) return 0;

  const members = await prisma.miniLeagueMember.findMany({
    select: {
      userId: true,
      user: {
        select: { notifyMatchStart: true, notifyMatchStartAll: true },
      },
    },
    distinct: ["userId"],
  });
  const eligibleUsers = members.filter((m) => m.user.notifyMatchStart);
  if (eligibleUsers.length === 0) return 0;

  const matchIds = upcoming.map((m) => m.id);
  const userIds = eligibleUsers.map((m) => m.userId);

  const [alreadyNotified, alreadyPredicted] = await Promise.all([
    prisma.notification.findMany({
      where: { matchId: { in: matchIds }, type: "MATCH_STARTING", userId: { in: userIds } },
      select: { userId: true, matchId: true },
    }),
    prisma.prediction.findMany({
      where: { matchId: { in: matchIds }, userId: { in: userIds } },
      select: { userId: true, matchId: true },
      distinct: ["userId", "matchId"],
    }),
  ]);

  const notifiedSet = new Set(alreadyNotified.map((n) => `${n.userId}:${n.matchId}`));
  const predictedSet = new Set(alreadyPredicted.map((p) => `${p.userId}:${p.matchId}`));

  const inputs = [];
  for (const match of upcoming) {
    for (const member of eligibleUsers) {
      const key = `${member.userId}:${match.id}`;
      if (notifiedSet.has(key)) continue;
      if (!member.user.notifyMatchStartAll && predictedSet.has(key)) continue;
      inputs.push({
        userId: member.userId,
        type: "MATCH_STARTING" as const,
        title: `⏰ ${match.homeTeam} vs ${match.awayTeam} empieza pronto`,
        body: predictedSet.has(key)
          ? "¡No te lo pierdas!"
          : "Última oportunidad para predecir.",
        link: "/ligas",
        matchId: match.id,
        teams: [match.homeTeam, match.awayTeam],
      });
    }
  }

  await createNotifications(inputs);
  return inputs.length;
}
