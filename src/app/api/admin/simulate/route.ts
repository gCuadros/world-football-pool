import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { TAGS } from "@/lib/cache-tags";
import { isAdminRequest } from "@/lib/admin-auth";
import { finalizeMatch } from "@/lib/recalculate";
import { notifyMatchResult } from "@/lib/notification-triggers";

const KICKOFFS_PER_TICK = 3;

function randomGoals() {
  const r = Math.random();
  if (r < 0.4) return 0;
  if (r < 0.75) return 1;
  if (r < 0.92) return 2;
  return 3;
}

/**
 * POST /api/admin/simulate — avanza el torneo un "tick":
 *  1) finaliza los partidos en directo con un marcador final,
 *  2) pone en directo los siguientes partidos próximos.
 * Los cachés de liga se invalidan en recalculateMatchPoints (dentro de finalizeMatch).
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const live = await prisma.match.findMany({ where: { status: "LIVE" } });
  const finalized: { matchNo: number; result: string }[] = [];
  for (const m of live) {
    const home = randomGoals();
    const away = randomGoals();
    await finalizeMatch(m.id, home, away);
    await notifyMatchResult(m.id);
    finalized.push({
      matchNo: m.matchNo,
      result: `${m.homeTeam} ${home}-${away} ${m.awayTeam}`,
    });
  }

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

  revalidateTag(TAGS.matches, "max");

  return NextResponse.json({ ok: true, finalized, started });
}
