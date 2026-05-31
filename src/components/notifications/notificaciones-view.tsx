"use client";

import Link from "next/link";
import { Radio, Trophy, Clock, Bell } from "lucide-react";

import { formatRelativeDay, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Notif = {
  id: string;
  kind: "live" | "result" | "reminder";
  title: string;
  detail: string;
  iso: string;
  points?: number | null;
};

const META = {
  live: { icon: Radio, tone: "text-live bg-live/10" },
  result: { icon: Trophy, tone: "text-primary bg-primary/10" },
  reminder: { icon: Clock, tone: "text-warning bg-warning/10" },
} as const;

export function NotificacionesView({ notifs }: { notifs: Notif[] }) {
  if (notifs.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
        <Bell className="mx-auto mb-3 size-8 opacity-40" />
        No tienes notificaciones por ahora.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-2">
      {notifs.map((n) => {
        const { icon: Icon, tone } = META[n.kind];
        const isReminder = n.kind === "reminder";
        const body = (
          <div className="border-border bg-card flex items-center gap-3 rounded-xl border p-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                tone,
              )}
            >
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{n.title}</p>
              <p className="text-muted-foreground truncate text-xs">{n.detail}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {n.points != null && n.points > 0 ? (
                <span className="text-success font-mono text-xs font-bold">
                  +{n.points}
                </span>
              ) : null}
              <span className="text-muted-foreground font-mono text-[10px]">
                {formatRelativeDay(n.iso)} · {formatTime(n.iso)}
              </span>
            </div>
          </div>
        );

        return isReminder ? (
          <Link key={n.id} href="/predicciones" className="block">
            {body}
          </Link>
        ) : (
          <div key={n.id}>{body}</div>
        );
      })}
    </div>
  );
}
