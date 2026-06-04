import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isAdminRequest } from "@/lib/admin-auth";
import { TAGS } from "@/lib/cache-tags";
import { importFriendlies } from "@/lib/import-friendlies";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/friendlies — importa/actualiza los amistosos (liga 10) desde
 * hoy hasta el inicio del Mundial. Re-ejecutable (cron) para refrescar
 * resultados; al finalizar un partido recalcula puntos/logros y notifica.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await importFriendlies();
  revalidateTag(TAGS.matches, "max");

  return NextResponse.json({ ok: true, ...result });
}

/**
 * DELETE /api/admin/friendlies — RESET: borra los partidos amistosos
 * (cascade elimina sus predicciones) y los logros de las ligas de amistosos.
 * Pensado para limpiar antes de que arranque el Mundial.
 */
export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Logros de ligas de amistosos.
  const friendlyLeagues = await prisma.miniLeague.findMany({
    where: { isFriendly: true },
    select: { id: true },
  });
  const leagueIds = friendlyLeagues.map((l) => l.id);
  const achievements = await prisma.achievement.deleteMany({
    where: { leagueId: { in: leagueIds } },
  });

  // Partidos amistosos (cascade borra sus predicciones).
  const matches = await prisma.match.deleteMany({ where: { stage: "FRIENDLY" } });

  revalidateTag(TAGS.matches, "max");

  return NextResponse.json({
    ok: true,
    matchesDeleted: matches.count,
    achievementsDeleted: achievements.count,
  });
}
