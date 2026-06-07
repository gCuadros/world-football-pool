"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Users, Bell, User, LogIn, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SidebarUser } from "@/components/app/nav-content";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
};

const LOGGED_IN_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, exact: true },
  { href: "/resultados", label: "Partidos", icon: Radio },
  { href: "/ligas", label: "Ligas", icon: Users },
  { href: "/notificaciones", label: "Avisos", icon: Bell },
  { href: "/ajustes", label: "Perfil", icon: User },
];

const GUEST_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: Home, exact: true },
  { href: "/resultados", label: "Partidos", icon: Radio },
  { href: "/mundial", label: "Grupos", icon: Globe },
  { href: "/login", label: "Entrar", icon: LogIn },
];

export function BottomNav({
  user,
  notificationCount,
}: {
  user: SidebarUser;
  notificationCount?: number;
}) {
  const pathname = usePathname();
  const items = user.isLoggedIn ? LOGGED_IN_ITEMS : GUEST_ITEMS;

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
        const showBadge = label === "Avisos" && !!notificationCount && notificationCount > 0;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-w-0",
              active
                ? "text-primary"
                : "text-muted-foreground active:text-foreground",
            )}
          >
            <div className="relative">
              <Icon
                className={cn("size-5", active && "stroke-[2.25]")}
                strokeWidth={active ? 2.25 : 1.75}
              />
              {showBadge && (
                <span className="bg-live text-live-foreground absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </div>
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
