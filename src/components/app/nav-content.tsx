"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy } from "lucide-react";

import { PRIMARY_NAV, ACCOUNT_NAV, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type SidebarUser = {
  name: string;
  email: string;
  initials: string;
  rank: number | null;
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

/** Contenido de navegación compartido por el sidebar (desktop) y el drawer (móvil). */
export function NavContent({
  user,
  onNavigate,
}: {
  user: SidebarUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-5 font-mono text-base font-bold tracking-tight">
        <Trophy className="text-sidebar-primary size-5" />
        QUINIELA
        <span className="text-sidebar-foreground/50 text-xs font-normal">
          · 2026
        </span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <p className="text-sidebar-foreground/40 px-3 pb-1 font-mono text-[10px] tracking-widest uppercase">
            Principal
          </p>
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="space-y-1">
          <p className="text-sidebar-foreground/40 px-3 pb-1 font-mono text-[10px] tracking-widest uppercase">
            Cuenta
          </p>
          {ACCOUNT_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      {/* Footer: usuario */}
      <div className="border-sidebar-border border-t p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <Avatar className="size-9">
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground font-mono text-xs">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-foreground truncate text-sm font-medium">
              {user.name}
            </p>
            <p className="text-sidebar-foreground/50 truncate text-xs">
              {user.rank ? `Puesto #${user.rank}` : "Sin ranking"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
