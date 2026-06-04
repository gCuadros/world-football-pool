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
  advancePick: z.enum(["HOME", "AWAY"]).nullable().optional(),
});

export type SavePredictionResult = { ok: true } | { ok: false; error: string };

export async function savePrediction(
  leagueId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
  advancePick?: "HOME" | "AWAY" | null,
): Promise<SavePredictionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "Sesión no válida." };
  }

  const parsed = schema.safeParse({ leagueId, matchId, homeScore, awayScore, advancePick });
  if (!parsed.success) {
    return { ok: false, error: "Datos no válidos." };
  }

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
      advancePick: parsed.data.advancePick ?? null,
    },
    update: {
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
      advancePick: parsed.data.advancePick ?? null,
    },
  });

  revalidateTag(leagueTag(parsed.data.leagueId), "max");
  revalidatePath(`/liga/${parsed.data.leagueId}/predicciones`);
  return { ok: true };
}
