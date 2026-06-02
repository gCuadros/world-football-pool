import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { MatchStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { TAGS } from "@/lib/cache-tags";
import { isAdminRequest } from "@/lib/admin-auth";
import { recalculateMatchPoints, rebuildAchievements } from "@/lib/recalculate";

const schema = z.object({
  homeScore: z.coerce.number().int().min(0).max(99).optional(),
  awayScore: z.coerce.number().int().min(0).max(99).optional(),
  status: z.enum(MatchStatus).optional(),
  liveMinute: z.coerce.number().int().min(0).max(130).nullish(),
});

// PATCH /api/admin/matches/[id] — actualiza marcador/estado de un partido.
// Si queda FINISHED, recalcula puntos + logros + invalida cachés de ligas.
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

  revalidateTag(TAGS.matches, "max");

  if (nextStatus === "FINISHED") {
    // recalculateMatchPoints revalida los tags de cada liga afectada.
    await recalculateMatchPoints(id);

    const affectedUsers = await prisma.prediction.findMany({
      where: { matchId: id },
      select: { userId: true },
      distinct: ["userId"],
    });
    await Promise.all(affectedUsers.map((u) => rebuildAchievements(u.userId)));
  }

  return NextResponse.json({ ok: true });
}
