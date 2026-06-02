"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, LogIn, Shield } from "lucide-react";

import { PUBLIC_NAV, APP_NAV, ACCOUNT_NAV, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export type SidebarUser = {
  isLoggedIn: boolean;
  name: string;
  email: string;
  initials: string;
  rank: number | null;
  leagueName: string | null;
  leagues: { id: string; name: string }[];
};

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: NavItem["icon"];
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sidebar-foreground/40 px-3 pb-1 font-mono text-[10px] tracking-widest uppercase">
      {children}
    </p>
  );
}

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
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-16 items-center gap-2 px-5 font-mono text-base font-bold tracking-tight"
      >
        <Trophy className="text-sidebar-primary size-5" />
        QUINIELA
        <span className="text-sidebar-foreground/50 text-xs font-normal">· 2026</span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {/* Zona pública — siempre visible */}
        <div className="space-y-1">
          <SectionLabel>Mundial</SectionLabel>
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        {/* Zona privada — solo logged */}
        {user.isLoggedIn && (
          <div className="space-y-1">
            <SectionLabel>Mi Quiniela</SectionLabel>
            {APP_NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                onNavigate={onNavigate}
              />
            ))}
            {/* Selector de ligas */}
            {user.leagues.map((league) => (
              <NavLink
                key={league.id}
                href={`/liga/${league.id}`}
                label={league.name}
                icon={Shield}
                active={pathname.startsWith(`/liga/${league.id}`)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}

        {/* Cuenta — solo logged */}
        {user.isLoggedIn && (
          <div className="space-y-1">
            <SectionLabel>Cuenta</SectionLabel>
            {ACCOUNT_NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Footer: usuario (logged) o CTA Entrar (guest) */}
      <div className="border-sidebar-border border-t p-3">
        {user.isLoggedIn ? (
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
                {user.rank && user.leagueName
                  ? `#${user.rank} · ${user.leagueName}`
                  : "Sin liga activa"}
              </p>
            </div>
          </div>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            <LogIn className="size-4" />
            Entrar
          </Link>
        )}
      </div>
    </div>
  );
}
