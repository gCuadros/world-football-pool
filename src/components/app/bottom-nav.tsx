"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Users, LogIn, Globe, SquarePen, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { SidebarUser } from "@/components/app/nav-content";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

const GUEST_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, exact: true },
  { href: "/resultados", label: "Partidos", icon: Radio },
  { href: "/mundial", label: "Grupos", icon: Globe },
  { href: "/login", label: "Entrar", icon: LogIn },
];

/**
 * Fallback estático del menú inferior: misma barra (altura, blur, safe-area)
 * con los tabs públicos deshabilitados visualmente. Evita que el menú
 * "desaparezca" mientras el slot con datos de usuario está suspendido.
 */
export function BottomNavSkeleton() {
  return (
    <nav
      aria-hidden
      className="border-border/50 dark:border-white/5 bg-background/90 vt-bottom-nav fixed bottom-0 left-0 right-0 z-30 flex select-none items-stretch border-t backdrop-blur-xl shadow-nav lg:hidden"
      style={{
        height: "calc(4rem + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {GUEST_ITEMS.map(({ href, label, icon: Icon }) => (
        <span
          key={href}
          className="text-muted-foreground/50 flex flex-1 flex-col items-center justify-center gap-0.5 text-3xs font-semibold"
        >
          <span className="flex h-7 w-13 items-center justify-center rounded-full">
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <span className="truncate">{label}</span>
        </span>
      ))}
    </nav>
  );
}

export function BottomNav({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const activeLeagueId = user.activeLeagueId;
  const activeLeague = user.leagues.find((l) => l.id === activeLeagueId);

  // Tab de liga: lleva a la favorita/activa pero con etiqueta fija "Liga"
  // (el nombre lo ponen los usuarios y puede ser largo o raro para un tab).
  const leagueItem: NavItem = activeLeague
    ? { href: `/liga/${activeLeague.id}`, label: "Liga", icon: Trophy }
    : { href: "/ligas", label: "Ligas", icon: Users };

  // Perfil vive en el topbar (avatar); aquí entra Partidos, núcleo de la app.
  const items: NavItem[] = user.isLoggedIn
    ? [
        { href: "/", label: "Inicio", icon: Home, exact: true },
        { href: "/resultados", label: "Partidos", icon: Radio },
        ...(activeLeagueId
          ? [{ href: `/liga/${activeLeagueId}/predicciones`, label: "Predecir", icon: SquarePen }]
          : []),
        leagueItem,
        { href: "/mundial", label: "Mundial", icon: Globe },
      ]
    : GUEST_ITEMS;

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    const matches = pathname === href || pathname.startsWith(href + "/");
    // El tab de liga (/liga/{id}) no se resalta en su subruta /predicciones,
    // que tiene su propio tab.
    if (href.startsWith("/liga/") && !href.includes("/predicciones")) {
      return matches && !pathname.includes("/predicciones");
    }
    return matches;
  };

  return (
    <nav
      aria-label="Navegación principal"
      className="border-border/50 dark:border-white/5 bg-background/90 vt-bottom-nav fixed bottom-0 left-0 right-0 z-30 flex select-none items-stretch border-t backdrop-blur-xl shadow-nav lg:hidden"
      // Altura = 4rem de tabs + safe-area: el inset se suma fuera, no comprime
      // los iconos (con h-16 fijo los tabs quedarían a 30px en iPhone).
      style={{
        height: "calc(4rem + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => haptics.tap()}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 text-3xs font-semibold transition-colors",
              active ? "text-primary" : "text-muted-foreground active:text-foreground",
            )}
          >
            {/* Pill detrás del icono: indicador de tab activa estilo app nativa */}
            <span
              className={cn(
                "flex h-7 w-13 items-center justify-center rounded-full transition-colors",
                active && "bg-primary/10 dark:bg-primary/15",
              )}
            >
              <Icon className={cn("size-5", active && "drop-shadow-[0_0_6px_rgba(29,111,242,0.55)] dark:drop-shadow-[0_0_8px_rgba(77,142,255,0.65)]")} strokeWidth={active ? 2.5 : 1.75} />
            </span>
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
