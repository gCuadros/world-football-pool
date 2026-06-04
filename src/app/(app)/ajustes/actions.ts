"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().trim().min(2, "Mínimo 2 caracteres").max(60),
  favoriteTeam: z.string().trim().max(40).nullable(),
  avatar: z
    .string()
    .max(100_000, "La imagen es demasiado grande.")
    .nullable()
    .optional(),
});

export type ProfileResult = { ok: true } | { ok: false; error: string };

export async function updateProfile(
  name: string,
  favoriteTeam: string | null,
  avatar?: string | null,
): Promise<ProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

  const parsed = schema.safeParse({ name, favoriteTeam: favoriteTeam || null, avatar });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      favoriteTeam: parsed.data.favoriteTeam,
      ...(parsed.data.avatar !== undefined
        ? { avatar: parsed.data.avatar, image: parsed.data.avatar }
        : {}),
    },
  });

  revalidatePath("/ajustes");
  revalidatePath("/predicciones");
  return { ok: true };
}
