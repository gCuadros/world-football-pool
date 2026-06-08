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
  /** Equipos del partido (para el filtro "solo equipos seguidos"). */
  teams?: string[];
};

function notifsTag(userId: string): string {
  return `notifs-${userId}`;
}

type UserPrefs = {
  notifyLiveGoals: boolean;
  notifyResults: boolean;
  notifyReminders: boolean;
  notifyLeague: boolean;
  notifyMatchStart: boolean;
  followedTeams: string[];
};

/** ¿El tipo de notificación está habilitado según las preferencias del usuario? */
function typeEnabled(type: NotificationType, p: UserPrefs): boolean {
  switch (type) {
    case "LIVE_GOAL":
      return p.notifyLiveGoals;
    case "MATCH_RESULT":
      return p.notifyResults;
    case "PREDICTION_REMINDER":
      return p.notifyReminders;
    case "MATCH_STARTING":
      return p.notifyMatchStart;
    case "LEAGUE_RANK":
    case "LEAGUE_JOIN":
      return p.notifyLeague;
    default:
      return true;
  }
}

/**
 * Filtra las entradas según las preferencias de cada usuario: descarta los tipos
 * desactivados y, si la entrada lleva `teams` y el usuario sigue equipos
 * concretos sin intersección, también la descarta. Aplica a in-app y push.
 */
async function filterByPreferences(
  inputs: NotificationInput[],
): Promise<NotificationInput[]> {
  const userIds = [...new Set(inputs.map((i) => i.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      notifyLiveGoals: true,
      notifyResults: true,
      notifyReminders: true,
      notifyLeague: true,
      notifyMatchStart: true,
      followedTeams: true,
    },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  return inputs.filter((i) => {
    const p = byId.get(i.userId);
    if (!p) return false;
    if (!typeEnabled(i.type, p)) return false;
    if (i.teams && i.teams.length > 0 && p.followedTeams.length > 0) {
      const followed = new Set(p.followedTeams);
      if (!i.teams.some((t) => followed.has(t))) return false;
    }
    return true;
  });
}

/**
 * Crea una notificación in-app y dispara Web Push (best-effort).
 * Invalida la caché del badge/lista del usuario.
 */
export async function createNotification(input: NotificationInput): Promise<void> {
  const [allowed] = await filterByPreferences([input]);
  if (!allowed) return;

  await prisma.notification.create({
    data: {
      userId: allowed.userId,
      type: allowed.type,
      title: allowed.title,
      body: allowed.body,
      link: allowed.link,
      matchId: allowed.matchId,
      leagueId: allowed.leagueId,
    },
  });

  revalidateTag(notifsTag(allowed.userId), "max");

  await sendPushToUser(allowed.userId, {
    title: allowed.title,
    body: allowed.body,
    link: allowed.link,
  });
}

/** Crea varias notificaciones (una por usuario) de forma eficiente. */
export async function createNotifications(
  rawInputs: NotificationInput[],
): Promise<void> {
  if (rawInputs.length === 0) return;

  const inputs = await filterByPreferences(rawInputs);
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
