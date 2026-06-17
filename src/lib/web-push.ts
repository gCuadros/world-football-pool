import "server-only";

import webpush from "web-push";

import { prisma } from "@/lib/prisma";

let configured = false;

/** Configura VAPID una vez. Devuelve false si faltan las claves (push desactivado). */
function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@quiniela.app",
    publicKey,
    privateKey,
  );
  configured = true;
  return true;
}

export function isPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export type PushPayload = {
  title: string;
  body: string;
  link?: string;
  /** Agrupa/REEMPLAZA notificaciones con el mismo tag (una por partido en
   *  directo, que se va actualizando con cada gol en vez de apilarse). */
  tag?: string;
  /** Con tag, vuelve a avisar (sonido/banner) al reemplazar. true para goles. */
  renotify?: boolean;
};

/**
 * Envía una notificación push a todas las suscripciones del usuario (best-effort).
 * Poda las suscripciones caducadas (404/410). No lanza si push no está configurado.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
        }
      }
    }),
  );
}
