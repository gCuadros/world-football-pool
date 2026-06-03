import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { isAdminRequest } from "@/lib/admin-auth";
import { importFromActiveProvider } from "@/lib/import-fixtures";
import { recalculateMatchPoints, rebuildAchievements } from "@/lib/recalculate";
import { notifyMatchResult } from "@/lib/notification-triggers";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/sync — sincroniza el calendario y resultados desde el
 * proveedor activo. Si llegan resultados nuevos, recalcula puntos y logros.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Partidos ya finalizados ANTES del import (para detectar los nuevos).
  const finishedBefore = new Set(
    (
      await prisma.match.findMany({
        where: { status: "FINISHED" },
        select: { id: true },
      })
    ).map((m) => m.id),
  );

  const result = await importFromActiveProvider();
  revalidateTag(TAGS.matches, "max");

  if (result.finishedUpdated > 0) {
    const finished = await prisma.match.findMany({
      where: { status: "FINISHED" },
      select: { id: true },
    });
    for (const m of finished) {
      // recalculateMatchPoints también revalida el tag de cada liga afectada.
      await recalculateMatchPoints(m.id);
    }

    const affectedUsers = await prisma.prediction.findMany({
      where: { match: { status: "FINISHED" } },
      select: { userId: true },
      distinct: ["userId"],
    });
    await Promise.all(affectedUsers.map((u) => rebuildAchievements(u.userId)));

    // Notifica solo los partidos recién finalizados en este sync.
    const newlyFinished = finished.filter((m) => !finishedBefore.has(m.id));
    for (const m of newlyFinished) {
      await notifyMatchResult(m.id);
    }
  }

  return NextResponse.json({ ok: true, ...result });
}
