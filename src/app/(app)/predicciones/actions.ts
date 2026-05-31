"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPredictionLocked } from "@/lib/scoring";

const schema = z.object({
  matchId: z.string().min(1),
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
});

export type SavePredictionResult = { ok: true } | { ok: false; error: string };

/**
 * Crea o actualiza la predicción del usuario para un partido.
 * Valida el cierre (kickoff − 15 min) EN EL SERVIDOR: no basta con el cliente.
 */
export async function savePrediction(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<SavePredictionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sesión no válida." };
  }

  const parsed = schema.safeParse({ matchId, homeScore, awayScore });
  if (!parsed.success) {
    return { ok: false, error: "Marcador no válido." };
  }

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { kickoffAt: true, status: true },
  });
  if (!match) {
    return { ok: false, error: "Partido no encontrado." };
  }

  if (match.status !== "UPCOMING" || isPredictionLocked(match.kickoffAt)) {
    return {
      ok: false,
      error: "Las predicciones para este partido están cerradas.",
    };
  }

  await prisma.prediction.upsert({
    where: {
      userId_matchId: {
        userId: session.user.id,
        matchId: parsed.data.matchId,
      },
    },
    create: {
      userId: session.user.id,
      matchId: parsed.data.matchId,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
    },
    update: {
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
    },
  });

  revalidatePath("/predicciones");
  revalidatePath("/partidos");
  return { ok: true };
}
