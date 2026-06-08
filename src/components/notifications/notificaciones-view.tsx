"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  Trophy,
  Goal,
  Users,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import type { NotificationVM } from "@/lib/notifications";
import type { NotificationType } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  markAllReadAction,
  markNotificationReadAction,
} from "@/app/(app)/notificaciones/actions";

const ICONS: Record<NotificationType, LucideIcon> = {
  PREDICTION_REMINDER: Clock,
  MATCH_RESULT: Trophy,
  LEAGUE_RANK: TrendingUp,
  LEAGUE_JOIN: Users,
  LIVE_GOAL: Goal,
};

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === yest.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificacionesView({ notifs }: { notifs: NotificationVM[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const unread = notifs.filter((n) => !n.read).length;

  function open(n: NotificationVM) {
    startTransition(async () => {
      if (!n.read) await markNotificationReadAction(n.id);
      if (n.link) router.push(n.link);
      else router.refresh();
    });
  }

  function markAll() {
    startTransition(async () => {
      await markAllReadAction();
      router.refresh();
    });
  }

  if (notifs.length === 0) {
    return (
      <div className="border-border text-muted-foreground mx-auto max-w-2xl rounded-2xl border border-dashed p-10 text-center text-sm">
        <Bell className="mx-auto mb-3 size-8 opacity-40" />
        No tienes notificaciones por ahora.
      </div>
    );
  }

  // Agrupar por día.
  const groups = new Map<string, NotificationVM[]>();
  for (const n of notifs) {
    const k = dayLabel(n.isoDate);
    const arr = groups.get(k) ?? [];
    arr.push(n);
    groups.set(k, arr);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="text-primary size-5" />
          <h1 className="text-xl font-bold">Notificaciones</h1>
          {unread > 0 && (
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-mono text-xs font-bold">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="text-primary text-sm font-medium hover:underline"
          >
            Marcar todas
          </button>
        )}
      </div>

      {[...groups.entries()].map(([day, items]) => (
        <section key={day} className="space-y-2">
          <p className="text-muted-foreground font-mono text-2xs tracking-widest uppercase">
            {day}
          </p>
          {items.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <button
                key={n.id}
                onClick={() => open(n)}
                className={cn(
                  "border-border bg-card hover:bg-muted/40 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  !n.read && "border-primary/30 bg-primary/5",
                )}
              >
                <div className="bg-secondary text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="text-muted-foreground truncate text-xs">{n.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!n.read && <span className="bg-primary size-2 rounded-full" />}
                  <span className="text-muted-foreground font-mono text-3xs">
                    {time(n.isoDate)}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
