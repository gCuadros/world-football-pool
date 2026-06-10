"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  Trophy,
  SoccerBall,
  UsersThree,
  TrendUp,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import type { NotificationVM } from "@/lib/notifications";
import type { NotificationType } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  markAllReadAction,
  markNotificationReadAction,
} from "@/app/(shell)/(app)/notificaciones/actions";

const ICONS: Record<NotificationType, PhosphorIcon> = {
  PREDICTION_REMINDER: Clock,
  MATCH_RESULT: Trophy,
  MATCH_STARTING: Clock,
  LEAGUE_RANK: TrendUp,
  LEAGUE_JOIN: UsersThree,
  LIVE_GOAL: SoccerBall,
};

function relative(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "ahora";
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

export function NotificationBell({
  count,
  items,
}: {
  count: number;
  items: NotificationVM[];
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function openItem(n: NotificationVM) {
    setOpen(false);
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative" />
        }
      >
        <Bell className="size-4.5" weight="bold" />
        {count > 0 && (
          <span className="bg-live text-live-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 font-mono text-3xs font-bold">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] max-w-[90vw] p-0">
        <div className="border-border flex items-center justify-between border-b p-4">
          <SheetTitle className="text-base font-bold">Notificaciones</SheetTitle>
          {count > 0 && (
            <button
              onClick={markAll}
              className="text-primary text-xs font-medium hover:underline"
            >
              Marcar todas
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 p-10 text-center text-sm">
            <Bell className="size-8 opacity-40" weight="duotone" />
            No tienes notificaciones.
          </div>
        ) : (
          <div className="divide-border divide-y overflow-y-auto">
            {items.map((n) => {
              const Icon = ICONS[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={cn(
                    "hover:bg-muted/40 flex w-full items-start gap-3 p-4 text-left transition-colors",
                    !n.read && "bg-primary/5",
                  )}
                >
                  <div className="bg-secondary text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="text-muted-foreground truncate text-xs">{n.body}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!n.read && <span className="bg-primary size-2 rounded-full" />}
                    <span className="text-muted-foreground font-mono text-3xs">
                      {relative(n.isoDate)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
