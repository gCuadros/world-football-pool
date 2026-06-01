import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { TAGS } from "@/lib/cache-tags";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  finalizeMatch,
  rebuildLeaderboardAndAchievements,
} from "@/lib/recalculate";

const KICKOFFS_PER_TICK = 3;

function randomGoals() {
  // Sesgo hacia marcadores bajos, típicos del fútbol.
  const r = Math.random();
  if (r < 0.4) return 0;
  if (r < 0.75) return 1;
  if (r < 0.92) return 2;
  return 3;
}

/**
 * POST /api/admin/simulate — avanza el torneo un "tick":
 *  1) finaliza los partidos en directo con un marcador final,
 *  2) pone en directo los siguientes partidos próximos,
 *  3) recalcula puntos, clasificación y logros.
 * Pensado para demos y para un cron real durante el torneo.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // 1) Finalizar los partidos en directo.
  const live = await prisma.match.findMany({ where: { status: "LIVE" } });
  const finalized: { matchNo: number; result: string }[] = [];
  for (const m of live) {
    const home = randomGoals();
    const away = randomGoals();
    await finalizeMatch(m.id, home, away);
    finalized.push({
      matchNo: m.matchNo,
      result: `${m.homeTeam} ${home}-${away} ${m.awayTeam}`,
    });
  }

  // 2) Arrancar los siguientes próximos.
  const next = await prisma.match.findMany({
    where: { status: "UPCOMING" },
    orderBy: { kickoffAt: "asc" },
    take: KICKOFFS_PER_TICK,
  });
  const started: { matchNo: number; match: string }[] = [];
  for (const m of next) {
    await prisma.match.update({
      where: { id: m.id },
      data: { status: "LIVE", homeScore: 0, awayScore: 0, liveMinute: 1 },
    });
    started.push({ matchNo: m.matchNo, match: `${m.homeTeam} vs ${m.awayTeam}` });
  }

  // 3) Recalcular clasificación y logros.
  await rebuildLeaderboardAndAchievements();

  revalidateTag(TAGS.matches, "max");
  revalidateTag(TAGS.leaderboard, "max");

  return NextResponse.json({ ok: true, finalized, started });
}
