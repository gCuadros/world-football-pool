import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isAdminRequest } from "@/lib/admin-auth";
import { TAGS } from "@/lib/cache-tags";
import { pollLiveGoals, generateMatchStartingAlerts } from "@/lib/notification-triggers";
import { importFriendlies } from "@/lib/import-friendlies";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/live — sondeo frecuente (p. ej. 60 s) durante ventanas de
 * partidos. Salta si no hay LIVE ni UPCOMING recién arrancados (kickoff en las
 * últimas 4h) para no gastar llamadas API innecesarias.
 *
 * Para amistosos también llama a importFriendlies cuando hay partidos en
 * ventana activa: `live=all` solo devuelve partidos EN JUEGO, así que sin este
 * paso los amistosos quedarían atascados en LIVE cuando terminan.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  const kickoffFloor = new Date(now.getTime() - 4 * 3_600_000);

  const [liveInDb, recentKickoffs, activeFriendlies] = await Promise.all([
    prisma.match.count({ where: { status: "LIVE" } }),
    prisma.match.count({
      where: { status: "UPCOMING", kickoffAt: { gte: kickoffFloor, lte: now } },
    }),
    // Amistosos que pueden estar en juego o acaban de terminar (kickoff < 3h).
    prisma.match.count({
      where: {
        stage: "FRIENDLY",
        status: { in: ["LIVE", "UPCOMING"] },
        kickoffAt: { lte: now, gte: new Date(now.getTime() - 3 * 3_600_000) },
      },
    }),
  ]);

  // Avisos pre-partido: siempre se intenta (solo BD, barato), incluso si no hay live.
  const startingAlerts = await generateMatchStartingAlerts(20);

  if (liveInDb === 0 && recentKickoffs === 0 && activeFriendlies === 0) {
    return NextResponse.json({ ok: true, skipped: true, goals: 0, startingAlerts });
  }

  // Sondeo en vivo para marcador/minuto (Mundial + amistosos en curso).
  const { goals, live } = await pollLiveGoals();
  revalidateTag(TAGS.matches, "max");

  // Sincronización completa de amistosos cuando hay partidos en ventana activa.
  // Necesario para capturar la transición LIVE → FINISHED que `live=all` no
  // incluye (los partidos terminados desaparecen del feed antes de actualizarse).
  let friendliesFinished = 0;
  if (activeFriendlies > 0) {
    const result = await importFriendlies();
    friendliesFinished = result.finishedUpdated;
    if (friendliesFinished > 0) revalidateTag(TAGS.matches, "max");
  }

  return NextResponse.json({ ok: true, live, goals, friendliesFinished, startingAlerts });
}
