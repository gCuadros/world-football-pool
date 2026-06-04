import { prisma } from "@/lib/prisma";
import { getFriendlyFixtures } from "@/lib/providers/api-football";
import { recalculateMatchPoints, rebuildAchievements } from "@/lib/recalculate";
import { notifyMatchResult } from "@/lib/notification-triggers";

const FRIENDLY_BASE_NO = 9000; // matchNo de amistosos, fuera del rango del Mundial (1-104)

export type FriendlyImportResult = {
  imported: number;
  created: number;
  finishedUpdated: number;
};

/**
 * Importa/actualiza los amistosos de selecciones (liga 10 de API-Football)
 * desde hoy hasta el inicio del Mundial. Re-ejecutable: actualiza marcadores
 * y, al detectar partidos recién finalizados, recalcula puntos, logros y
 * dispara notificaciones (mismo pipeline que el Mundial).
 */
export async function importFriendlies(): Promise<FriendlyImportResult> {
  const all = await getFriendlyFixtures();

  // Solo amistosos que involucren al menos una selección del Mundial.
  const wc = await prisma.match.findMany({
    where: { stage: "GROUP_STAGE" },
    select: { homeTeam: true, awayTeam: true },
  });
  const wcTeams = new Set<string>();
  for (const m of wc) {
    wcTeams.add(m.homeTeam);
    wcTeams.add(m.awayTeam);
  }
  const fixtures =
    wcTeams.size === 0
      ? all // sin Mundial cargado todavía → no filtrar
      : all.filter(
          (f) => wcTeams.has(f.homeTeam) || wcTeams.has(f.awayTeam),
        );

  const maxRow = await prisma.match.aggregate({ _max: { matchNo: true } });
  let nextNo = Math.max(maxRow._max.matchNo ?? 0, FRIENDLY_BASE_NO) + 1;

  let created = 0;
  let finishedUpdated = 0;
  const newlyFinished: string[] = [];

  for (const f of fixtures) {
    if (!f.externalId) continue;

    const existing = await prisma.match.findUnique({
      where: { externalId: f.externalId },
      select: { id: true, status: true },
    });
    const wasFinished = existing?.status === "FINISHED";

    const data = {
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      homeFlag: f.homeFlag,
      awayFlag: f.awayFlag,
      homeCrest: f.homeCrest,
      awayCrest: f.awayCrest,
      kickoffAt: f.kickoffAt,
      stage: f.stage,
      group: null,
      stadium: f.stadium,
      city: f.city || null,
      homeScore: f.homeScore,
      awayScore: f.awayScore,
      status: f.status,
      liveMinute: f.liveMinute,
    };

    let matchId: string;
    if (existing) {
      await prisma.match.update({ where: { id: existing.id }, data });
      matchId = existing.id;
    } else {
      const m = await prisma.match.create({
        data: { ...data, matchNo: nextNo++, externalId: f.externalId },
        select: { id: true },
      });
      matchId = m.id;
      created++;
    }

    if (!wasFinished && f.status === "FINISHED") {
      finishedUpdated++;
      newlyFinished.push(matchId);
    }
  }

  // Pipeline para los recién finalizados: puntos → logros → notificaciones.
  for (const matchId of newlyFinished) {
    await recalculateMatchPoints(matchId);
    const pairs = await prisma.prediction.findMany({
      where: { matchId },
      select: { userId: true, leagueId: true },
      distinct: ["userId", "leagueId"],
    });
    await Promise.all(
      pairs.map((p) => rebuildAchievements(p.userId, p.leagueId)),
    );
    await notifyMatchResult(matchId);
  }

  return { imported: fixtures.length, created, finishedUpdated };
}
