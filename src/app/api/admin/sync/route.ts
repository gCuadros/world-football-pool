import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { isAdminRequest } from "@/lib/admin-auth";
import { importFixtures } from "@/lib/import-fixtures";
import { openfootballProvider } from "@/lib/providers/openfootball";
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

  const result = await importFixtures(openfootballProvider);

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

    for (const p of ["/partidos", "/predicciones", "/clasificacion", "/logros"]) {
      revalidatePath(p);
    }
  } else {
    revalidatePath("/partidos");
  }

  return NextResponse.json({ ok: true, ...result });
}
