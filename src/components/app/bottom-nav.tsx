"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Users, User, LogIn, Globe, SquarePen, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
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

export function BottomNav({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const activeLeagueId = user.activeLeagueId;
  const activeLeague = user.leagues.find((l) => l.id === activeLeagueId);

  // Tab de liga: la favorita/activa (su nombre y página). Sin liga → la lista.
  const leagueItem: NavItem = activeLeague
    ? { href: `/liga/${activeLeague.id}`, label: activeLeague.name, icon: Trophy }
    : { href: "/ligas", label: "Ligas", icon: Users };

  const items: NavItem[] = user.isLoggedIn
    ? [
        { href: "/", label: "Inicio", icon: Home, exact: true },
        { href: "/resultados", label: "Partidos", icon: Radio },
        ...(activeLeagueId
          ? [{ href: `/liga/${activeLeagueId}/predicciones`, label: "Predecir", icon: SquarePen }]
          : []),
        leagueItem,
        { href: "/ajustes", label: "Perfil", icon: User },
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
      className="border-border bg-background/95 fixed bottom-0 left-0 right-0 z-30 flex h-16 items-stretch border-t backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 text-3xs font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground active:text-foreground",
            )}
          >
            <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
