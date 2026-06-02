"use server";

import { revalidatePath } from "next/cache";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isPredictionLocked } from "@/lib/scoring";
import { leagueTag } from "@/lib/cache-tags";

const schema = z.object({
  leagueId: z.string().min(1),
  matchId: z.string().min(1),
  homeScore: z.coerce.number().int().min(0).max(99),
  awayScore: z.coerce.number().int().min(0).max(99),
});

export type SavePredictionResult = { ok: true } | { ok: false; error: string };

/**
 * Crea o actualiza la predicción del usuario para un partido EN UNA LIGA.
 * Valida: sesión válida, membresía en la liga, partido no cerrado.
 * Autorrelleno: si el usuario ya tiene predicción en otra liga para ese partido,
 * el cliente puede haberla pre-rellenado; el servidor solo valida lo enviado.
 */
export async function savePrediction(
  leagueId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<SavePredictionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sesión no válida." };
  }

  const parsed = schema.safeParse({ leagueId, matchId, homeScore, awayScore });
  if (!parsed.success) {
    return { ok: false, error: "Datos no válidos." };
  }

  // Verificar membresía en la liga.
  const membership = await prisma.miniLeagueMember.findUnique({
    where: {
      userId_miniLeagueId: {
        userId: session.user.id,
        miniLeagueId: parsed.data.leagueId,
      },
    },
  });
  if (!membership) {
    return { ok: false, error: "No perteneces a esta liga." };
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
      userId_leagueId_matchId: {
        userId: session.user.id,
        leagueId: parsed.data.leagueId,
        matchId: parsed.data.matchId,
      },
    },
    create: {
      userId: session.user.id,
      leagueId: parsed.data.leagueId,
      matchId: parsed.data.matchId,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
    },
    update: {
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
    },
  });

  revalidateTag(leagueTag(parsed.data.leagueId), "max");
  revalidatePath(`/liga/${parsed.data.leagueId}/predicciones`);
  return { ok: true };
}
