import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { TAGS } from "@/lib/cache-tags";
import { isAdminRequest } from "@/lib/admin-auth";
import { importFromActiveProvider } from "@/lib/import-fixtures";
import {
  recalculateMatchPoints,
  rebuildLeaderboardAndAchievements,
} from "@/lib/recalculate";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/sync — sincroniza el calendario y los resultados desde el
 * proveedor de datos y recalcula puntos/clasificación/logros si hay resultados
 * nuevos. Pensado para un cron durante el torneo (protegido con ADMIN_SECRET).
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await importFromActiveProvider();
  // El calendario pudo cambiar → invalida la caché de partidos (use cache).
  // "max" = stale-while-revalidate (recomendado): el siguiente visitante ve el
  // dato ~1 request viejo y se regenera en background. Para expiración inmediata
  // (cache miss bloqueante) se podría usar revalidateTag(TAGS.matches, { expire: 0 }).
  revalidateTag(TAGS.matches, "max");

  // Si llegaron resultados nuevos, recalcula puntos de los partidos terminados.
  if (result.finishedUpdated > 0) {
    const finished = await prisma.match.findMany({
      where: { status: "FINISHED" },
      select: { id: true },
    });
    for (const m of finished) {
      await recalculateMatchPoints(m.id);
    }
    await rebuildLeaderboardAndAchievements();
    revalidateTag(TAGS.leaderboard, "max");
  }

  return NextResponse.json({ ok: true, ...result });
}
