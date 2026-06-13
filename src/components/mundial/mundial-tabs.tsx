"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type MundialTab = "grupos" | "eliminatorias" | "estadisticas";

const TABS: { id: MundialTab; label: string }[] = [
  { id: "grupos", label: "Grupos" },
  { id: "eliminatorias", label: "Eliminatorias" },
  { id: "estadisticas", label: "Estadísticas" },
];

/**
 * Tabs en la MISMA página: Grupos / Eliminatorias / Estadísticas. Los tres
 * paneles llegan pre-renderizados del servidor (slots) y solo se alterna su
 * visibilidad — cambio instantáneo, sin navegar a otra ruta (antes los chips
 * llevaban a páginas sueltas sin botón atrás de las que no se podía volver).
 *
 * `initialTab` viene de ?tab= (deep link desde el menú lateral); al cambiar
 * de pestaña se actualiza la URL sin recargar para que sea compartible.
 */
export function MundialTabs({
  initialTab,
  grupos,
  eliminatorias,
  estadisticas,
}: {
  initialTab: MundialTab;
  grupos: React.ReactNode;
  eliminatorias: React.ReactNode;
  estadisticas: React.ReactNode;
}) {
  const [tab, setTab] = useState<MundialTab>(initialTab);

  const select = (id: MundialTab) => {
    setTab(id);
    const url = id === "grupos" ? "/mundial" : `/mundial?tab=${id}`;
    window.history.replaceState(null, "", url);
  };

  const panel = { grupos, eliminatorias, estadisticas };

  return (
    <>
      <nav className="scrollbar-none flex gap-2 overflow-x-auto py-3" role="tablist">
        {TABS.map(({ id, label }) => {
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

      {/* Los tres paneles montados; solo el activo es visible (cambio instantáneo). */}
      {TABS.map(({ id }) => (
        <div key={id} role="tabpanel" hidden={tab !== id}>
          {panel[id]}
        </div>
      ))}
    </>
  );
}
