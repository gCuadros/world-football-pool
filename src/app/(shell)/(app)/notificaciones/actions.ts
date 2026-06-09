"use server";

import { auth } from "@/auth";
import { markRead, markAllRead } from "@/lib/notifications";

export async function markNotificationReadAction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await markRead(session.user.id, id);
}

export async function markAllReadAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  await markAllRead(session.user.id);
}
