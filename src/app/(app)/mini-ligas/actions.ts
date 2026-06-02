"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  revalidatePath("/ligas");
  return { ok: true, leagueId: league.id, code: league.name };
}
