import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isAdminRequest } from "@/lib/admin-auth";
import { TAGS } from "@/lib/cache-tags";
import { pollLiveGoals } from "@/lib/notification-triggers";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/live — sondeo frecuente (p. ej. 60 s) durante ventanas de
 * partidos. Si NO hay partidos en vivo en BD, no llama a la API (barato).
 * Si hay, usa 1 sola llamada `live=all` para actualizar marcadores y notificar
 * goles a quienes los predijeron.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Atajo barato: si no hay partidos LIVE en BD, no tocamos la API.
  const liveInDb = await prisma.match.count({ where: { status: "LIVE" } });
  if (liveInDb === 0) {
    return NextResponse.json({ ok: true, skipped: true, goals: 0 });
  }

  const { goals, live } = await pollLiveGoals();
  revalidateTag(TAGS.matches, "max");

  return NextResponse.json({ ok: true, live, goals });
}
