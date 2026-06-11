import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isAdminRequest } from "@/lib/admin-auth";
import { TAGS } from "@/lib/cache-tags";
import { pollLiveGoals, generateMatchStartingAlerts } from "@/lib/notification-triggers";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/live — sondeo frecuente (p. ej. 60 s) durante ventanas de
 * partidos. Salta si no hay LIVE ni UPCOMING recién arrancados (kickoff en las
 * últimas 4h) para no gastar llamadas API innecesarias.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const kickoffFloor = new Date(now.getTime() - 4 * 3_600_000);

  const [liveInDb, recentKickoffs] = await Promise.all([
    prisma.match.count({ where: { status: "LIVE" } }),
    prisma.match.count({
      where: { status: "UPCOMING", kickoffAt: { gte: kickoffFloor, lte: now } },
    }),
  ]);

  // Avisos pre-partido: siempre se intenta (solo BD, barato), incluso si no hay live.
  const startingAlerts = await generateMatchStartingAlerts(20);

  if (liveInDb === 0 && recentKickoffs === 0) {
    return NextResponse.json({ ok: true, skipped: true, goals: 0, startingAlerts });
  }

  // Sondeo en vivo para marcador/minuto.
  const { goals, live } = await pollLiveGoals();
  revalidateTag(TAGS.matches, "max");

  return NextResponse.json({ ok: true, live, goals, startingAlerts });
}
