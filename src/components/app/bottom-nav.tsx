"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Users, User, LogIn, Globe, SquarePen } from "lucide-react";

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
  const activeLeagueId = user.leagues[0]?.id ?? null;

  const items: NavItem[] = user.isLoggedIn
    ? [
        { href: "/", label: "Inicio", icon: Home, exact: true },
        { href: "/mundial", label: "Mundial", icon: Globe },
        ...(activeLeagueId
          ? [{ href: `/liga/${activeLeagueId}/predicciones`, label: "Predecir", icon: SquarePen }]
          : [{ href: "/ligas", label: "Ligas", icon: Users }]),
        { href: "/resultados", label: "Partidos", icon: Radio },
        { href: "/ajustes", label: "Perfil", icon: User },
      ]
    : GUEST_ITEMS;

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

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
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 text-[10px] font-medium transition-colors",
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
