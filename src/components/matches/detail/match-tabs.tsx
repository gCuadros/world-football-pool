"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type MatchTab = "partido" | "cronica" | "cuotas" | "h2h" | "clasificacion" | "video";

const ALL_TABS: { id: MatchTab; label: string }[] = [
  { id: "partido", label: "Partido" },
  { id: "cronica", label: "Crónica" },
  { id: "cuotas", label: "Cuotas" },
  { id: "h2h", label: "H2H" },
  { id: "clasificacion", label: "Clasificación" },
  { id: "video", label: "Vídeo" },
];

export function MatchTabs({
  initialTab = "partido",
  partido,
  cronica,
  cuotas,
  h2h,
  clasificacion,
  video,
}: {
  initialTab?: MatchTab;
  partido: React.ReactNode;
  cronica?: React.ReactNode;
  cuotas?: React.ReactNode;
  h2h?: React.ReactNode;
  clasificacion?: React.ReactNode;
  video?: React.ReactNode;
}) {
  const slots: Record<MatchTab, React.ReactNode> = {
    partido,
    cronica: cronica ?? null,
    cuotas: cuotas ?? null,
    h2h: h2h ?? null,
    clasificacion: clasificacion ?? null,
    video: video ?? null,
  };

  const tabs = ALL_TABS.filter(({ id }) => id === "partido" || slots[id] != null);

  const [tab, setTab] = useState<MatchTab>(() =>
    tabs.some((t) => t.id === initialTab) ? initialTab : "partido",
  );

  const select = (id: MatchTab) => {
    setTab(id);
    const url =
      id === "partido"
        ? window.location.pathname
        : `${window.location.pathname}?t=${id}`;
    window.history.replaceState(null, "", url);
  };

  return (
    <>
      <nav className="scrollbar-none sticky top-0 z-20 -mx-0 flex gap-2 overflow-x-auto bg-background/90 py-3 backdrop-blur-sm" role="tablist">
        {tabs.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => select(id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_2px_14px_-3px_var(--color-primary)]"
                  : "chip-glass text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </nav>
      {tabs.map(({ id }) => (
        <div key={id} role="tabpanel" hidden={tab !== id}>
          {slots[id]}
        </div>
      ))}
    </>
  );
}
