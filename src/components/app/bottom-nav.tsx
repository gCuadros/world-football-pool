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
      className="vt-bottom-nav border-t border-border/30 dark:border-white/5 bg-background/85 fixed bottom-0 left-0 right-0 z-30 flex select-none items-stretch backdrop-blur-2xl shadow-nav lg:hidden"
      style={{
        height: "calc(4rem + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {GUEST_ITEMS.map(({ href, label, icon: Icon }) => (
        <span
          key={href}
          className="text-muted-foreground/40 flex flex-1 flex-col items-center justify-center gap-0.5"
        >
          <Icon className="size-5" strokeWidth={1.75} />
          <span className="text-3xs font-medium truncate">{label}</span>
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
      className="vt-bottom-nav border-t border-border/30 dark:border-white/5 bg-background/85 fixed bottom-0 left-0 right-0 z-30 flex select-none items-stretch backdrop-blur-2xl shadow-nav lg:hidden"
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
            className="relative flex flex-1 items-center justify-center min-w-0 px-1"
          >
            {active ? (
              /* Pill rellena con icono + label: patrón de app nativa premium */
              <span className="bg-primary text-primary-foreground flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold shadow-[0_0_22px_-4px_var(--color-primary)] transition-all max-w-full">
                <Icon className="size-4 shrink-0" strokeWidth={2.5} />
                <span className="truncate">{label}</span>
              </span>
            ) : (
              <span className={cn(
                "flex flex-col items-center gap-0.5 transition-colors",
                "text-muted-foreground active:text-foreground",
              )}>
                <Icon className="size-5" strokeWidth={1.75} />
                <span className="text-3xs font-medium truncate">{label}</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
