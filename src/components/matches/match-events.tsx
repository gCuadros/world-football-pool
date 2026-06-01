"use client";

import { useState } from "react";
import { ChevronDown, Loader2, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";

type EventVM = {
  minute: number | null;
  team: string;
  player: string | null;
  type: string;
  detail: string;
};

function icon(type: string, detail: string): string {
  const t = type.toLowerCase();
  if (t === "goal") return detail.toLowerCase().includes("own") ? "🥅" : "⚽";
  if (t === "card")
    return detail.toLowerCase().includes("red") ? "🟥" : "🟨";
  if (t === "subst") return "🔁";
  return "•";
}

/** Eventos del partido (goles/tarjetas) cargados on-demand desde API-Football. */
export function MatchEvents({ matchId }: { matchId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventVM[] | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && events === null && !loading) {
      setLoading(true);
      try {
        const res = await fetch(`/api/matches/${matchId}/events`);
        const data = await res.json();
        setEvents(data.events ?? []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="border-border border-t pt-3">
      <button
        type="button"
        onClick={toggle}
        className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-xs font-medium transition-colors"
      >
        <ListChecks className="size-3.5" />
        Eventos del partido
        <ChevronDown
          className={cn("ml-auto size-4 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="mt-3 space-y-1.5">
          {loading ? (
            <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
              <Loader2 className="size-3.5 animate-spin" /> Cargando…
            </div>
          ) : events && events.length > 0 ? (
            events.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-7 shrink-0 font-mono">
                  {e.minute != null ? `${e.minute}'` : "—"}
                </span>
                <span>{icon(e.type, e.detail)}</span>
                <span className="min-w-0 flex-1 truncate">
                  {e.player ?? e.detail}
                </span>
                <span className="text-muted-foreground shrink-0 truncate text-[10px]">
                  {e.team}
                </span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground py-2 text-xs">
              Sin eventos registrados.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
