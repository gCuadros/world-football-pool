"use server";

 import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TAGS } from "@/lib/cache-tags";
import { sendPushToUser } from "@/lib/web-push";

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
  revalidateTag(TAGS.users, "max");
  return { ok: true };
}

const prefsSchema = z.object({
  notifyLiveGoals: z.boolean(),
  notifyResults: z.boolean(),
  notifyReminders: z.boolean(),
  notifyLeague: z.boolean(),
  followedTeams: z.array(z.string().trim().max(40)).max(48),
});

export type NotificationPrefs = z.infer<typeof prefsSchema>;

/** Guarda las preferencias de notificación (tipos + equipos a seguir). */
export async function updateNotificationPrefs(
  prefs: NotificationPrefs,
): Promise<ProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

  const parsed = prefsSchema.safeParse(prefs);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      notifyLiveGoals: parsed.data.notifyLiveGoals,
      notifyResults: parsed.data.notifyResults,
      notifyReminders: parsed.data.notifyReminders,
      notifyLeague: parsed.data.notifyLeague,
      followedTeams: [...new Set(parsed.data.followedTeams)],
    },
  });

  revalidatePath("/ajustes");
  return { ok: true };
}

/** Envía una notificación push de prueba al propio usuario (verificación). */
export async function sendTestNotification(): Promise<ProfileResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Sesión no válida." };

  const subs = await prisma.pushSubscription.count({
    where: { userId: session.user.id },
  });
  if (subs === 0) {
    return {
      ok: false,
      error: "No hay ningún dispositivo suscrito. Activa las notificaciones aquí primero.",
    };
  }

  await sendPushToUser(session.user.id, {
    title: "🔔 Notificación de prueba",
    body: "¡Funciona! Recibirás avisos del Mundial aquí.",
    link: "/notificaciones",
  });

  return { ok: true };
}
