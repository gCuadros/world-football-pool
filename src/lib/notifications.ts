import "server-only";

import { cacheTag, cacheLife, revalidateTag } from "next/cache";

import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/web-push";
import type { NotificationType } from "@prisma/client";

export type NotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  matchId?: string;
  leagueId?: string;
};

function notifsTag(userId: string): string {
  return `notifs-${userId}`;
}

/**
 * Crea una notificación in-app y dispara Web Push (best-effort).
 * Invalida la caché del badge/lista del usuario.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      matchId: input.matchId,
      leagueId: input.leagueId,
    },
  });

  revalidateTag(notifsTag(input.userId), "max");

  await sendPushToUser(input.userId, {
    title: input.title,
    body: input.body,
    link: input.link,
  });
}

/** Crea varias notificaciones (una por usuario) de forma eficiente. */
export async function createNotifications(
  inputs: NotificationInput[],
): Promise<void> {
  if (inputs.length === 0) return;

  await prisma.notification.createMany({
    data: inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      title: i.title,
      body: i.body,
      link: i.link,
      matchId: i.matchId,
      leagueId: i.leagueId,
    })),
  });

  const userIds = [...new Set(inputs.map((i) => i.userId))];
  for (const id of userIds) revalidateTag(notifsTag(id), "max");

  // Push best-effort en paralelo.
  await Promise.all(
    inputs.map((i) =>
      sendPushToUser(i.userId, {
        title: i.title,
        body: i.body,
        link: i.link,
      }),
    ),
  );
}

export type NotificationVM = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  isoDate: string;
};

function toVM(n: {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationVM {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.readAt !== null,
    isoDate: n.createdAt.toISOString(),
  };
}

/** Nº de notificaciones sin leer — CACHEADO por usuario (badge de la campana). */
export async function getUnreadCount(userId: string): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`notifs-${userId}`);
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Últimas notificaciones (panel de la campana) — CACHEADO por usuario. */
export async function getRecentNotifications(
  userId: string,
  limit = 8,
): Promise<NotificationVM[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`notifs-${userId}`);
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toVM);
}

/** Lista completa para la página /notificaciones. */
export async function getNotifications(userId: string): Promise<NotificationVM[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(toVM);
}

export async function markRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateTag(`notifs-${userId}`, "max");
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateTag(`notifs-${userId}`, "max");
}
