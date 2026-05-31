import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MatchStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/admin-auth";
import {
  recalculateMatchPoints,
  rebuildLeaderboardAndAchievements,
} from "@/lib/recalculate";

const schema = z.object({
  homeScore: z.coerce.number().int().min(0).max(99).optional(),
  awayScore: z.coerce.number().int().min(0).max(99).optional(),
  status: z.nativeEnum(MatchStatus).optional(),
  liveMinute: z.coerce.number().int().min(0).max(130).nullish(),
});

function revalidateAll() {
  for (const p of ["/partidos", "/predicciones", "/clasificacion", "/logros"]) {
    revalidatePath(p);
  }
}

// PATCH /api/admin/matches/[id] — actualiza marcador/estado de un partido.
// Si queda FINISHED, recalcula puntos + clasificación + logros.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const data = parsed.data;
  const nextStatus = data.status ?? match.status;
  const nextHome = data.homeScore ?? match.homeScore;
  const nextAway = data.awayScore ?? match.awayScore;

  if (nextStatus === "FINISHED" && (nextHome === null || nextAway === null)) {
    return NextResponse.json(
      { error: "Un partido FINISHED requiere marcador." },
      { status: 400 },
    );
  }

  await prisma.match.update({
    where: { id },
    data: {
      homeScore: nextHome,
      awayScore: nextAway,
      status: nextStatus,
      liveMinute:
        nextStatus === "LIVE" ? (data.liveMinute ?? match.liveMinute) : null,
    },
  });

  if (nextStatus === "FINISHED") {
    await recalculateMatchPoints(id);
    await rebuildLeaderboardAndAchievements();
  }

  revalidateAll();
  return NextResponse.json({ ok: true });
}
