"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";

export type LeagueResult =
  | { ok: true; leagueId?: string; code?: string }
  | { ok: false; error: string };

const nameSchema = z.string().trim().min(3, "Mínimo 3 caracteres").max(40);
const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(6, "El código tiene 6 caracteres");

// Caracteres sin ambigüedad (sin O/0, I/1).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export async function createLeague(name: string): Promise<LeagueResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  let code = randomCode();
  for (let attempt = 0; attempt < 6; attempt++) {
    const exists = await prisma.miniLeague.findUnique({
      where: { inviteCode: code },
    });
    if (!exists) break;
    code = randomCode();
  }

  const league = await prisma.miniLeague.create({
    data: {
      name: parsed.data,
      inviteCode: code,
      createdById: session.user.id,
      members: { create: { userId: session.user.id } },
    },
  });

  revalidatePath("/ligas");
  return { ok: true, leagueId: league.id, code: league.inviteCode };
}

export async function joinLeague(code: string): Promise<LeagueResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const league = await prisma.miniLeague.findUnique({
    where: { inviteCode: parsed.data },
  });
  if (!league) {
    return { ok: false, error: "No existe ninguna liga con ese código." };
  }

  const already = await prisma.miniLeagueMember.findUnique({
    where: {
      userId_miniLeagueId: {
        userId: session.user.id,
        miniLeagueId: league.id,
      },
    },
  });
  if (already) {
    return { ok: false, error: "Ya perteneces a esta liga." };
  }

  await prisma.miniLeagueMember.create({
    data: { userId: session.user.id, miniLeagueId: league.id },
  });

  // Avisa a los miembros existentes de la liga.
  const newName = session.user.name ?? "Alguien";
  const others = await prisma.miniLeagueMember.findMany({
    where: { miniLeagueId: league.id, userId: { not: session.user.id } },
    select: { userId: true },
  });
  await createNotifications(
    others.map((m) => ({
      userId: m.userId,
      type: "LEAGUE_JOIN" as const,
      title: `${newName} se ha unido a ${league.name}`,
      body: "Tienes nueva competencia en tu liga.",
      link: `/liga/${league.id}`,
      leagueId: league.id,
    })),
  );

  revalidatePath("/ligas");
  return { ok: true, leagueId: league.id, code: league.name };
}

/**
 * Marca una liga como favorita del usuario (la que aparece en la barra inferior).
 * Valida que el usuario sea miembro de esa liga.
 */
export async function setFavoriteLeague(
  leagueId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

  const membership = await prisma.miniLeagueMember.findUnique({
    where: {
      userId_miniLeagueId: { userId: session.user.id, miniLeagueId: leagueId },
    },
  });
  if (!membership) return { ok: false, error: "No perteneces a esa liga." };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { favoriteLeagueId: leagueId },
  });

  revalidatePath("/ligas");
  revalidatePath("/", "layout");
  return { ok: true };
}
