"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trophy, LogIn, type LucideIcon } from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import {
  EXPLORE_NAV,
  LEAGUE_NAV,
  ACCOUNT_NAV,
  PREDICCIONES_ICON,
} from "@/lib/nav";
import { cn } from "@/lib/utils";

export type SidebarUser = {
  isLoggedIn: boolean;
  name: string;
  email: string;
  initials: string;
  avatar?: string | null;
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
  indent,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3.5 rounded-full py-2.5 text-[15px] transition-colors",
        indent ? "px-2 pl-7" : "px-3.5",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon
        className={cn("shrink-0", indent ? "size-[18px]" : "size-[22px]")}
        strokeWidth={1.75}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground px-3.5 pt-2 pb-1.5 font-mono text-[10px] font-semibold tracking-[0.16em] uppercase">
      {children}
    </p>
  );
}

function Separator() {
  return <div className="bg-sidebar-border my-2 h-px w-full" />;
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

  const activeLeagueId = user.leagues[0]?.id ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header / logo */}
      <Link
        href="/"
        onClick={onNavigate}
        className="border-sidebar-border flex h-[72px] items-center gap-2.5 border-b px-6 lg:h-[88px]"
      >
        <div className="bg-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
          <Trophy className="size-5 text-white" strokeWidth={2} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sidebar-primary font-mono text-[13px] leading-none font-bold tracking-[0.12em]">
            QUINIELA
          </span>
          <span className="text-sidebar-foreground text-[11px] leading-none">
            Mundial 2026
          </span>
        </div>
      </Link>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <SectionLabel>Explorar</SectionLabel>
        {EXPLORE_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={isActive(item.href)}
            onNavigate={onNavigate}
          />
        ))}

        {user.isLoggedIn && (
          <>
            <Separator />
            <SectionLabel>Mis Ligas</SectionLabel>
            {LEAGUE_NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={isActive(item.href)}
                onNavigate={onNavigate}
              />
            ))}
            {user.leagues.map((league) => (
              <NavLink
                key={league.id}
                href={`/liga/${league.id}`}
                label={league.name}
                icon={Trophy}
                active={
                  pathname.startsWith(`/liga/${league.id}`) &&
                  !pathname.includes("/predicciones")
                }
                onNavigate={onNavigate}
                indent
              />
            ))}
            {activeLeagueId && (
              <NavLink
                href={`/liga/${activeLeagueId}/predicciones`}
                label="Predicciones"
                icon={PREDICCIONES_ICON}
                active={/^\/liga\/[^/]+\/predicciones/.test(pathname)}
                onNavigate={onNavigate}
                indent
              />
            )}

            <Separator />
            <SectionLabel>Cuenta</SectionLabel>
            {ACCOUNT_NAV.map((item) => (
              <NavLink
                key={item.label}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={item.label === "Ajustes" && isActive(item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </>
        )}
      </nav>

      {/* Footer: usuario (logged) o CTA Entrar (guest) */}
      <div className="border-sidebar-border border-t p-5">
        {user.isLoggedIn ? (
          <Link href="/ajustes" onClick={onNavigate} className="flex items-center gap-2.5 rounded-xl transition-colors hover:opacity-80">
            <Avatar className="size-9 shrink-0">
              {user.avatar && <AvatarImage src={user.avatar} />}
              <AvatarFallback className="bg-primary font-mono text-[13px] font-bold text-white">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sidebar-accent-foreground truncate text-[13px] font-medium">
                {user.name}
              </p>
              <p className="text-muted-foreground truncate font-mono text-[11px]">
                {user.rank && user.leagueName
                  ? `#${user.rank} · ${user.leagueName}`
                  : "Sin liga activa"}
              </p>
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            onClick={onNavigate}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-colors"
          >
            <LogIn className="size-4" />
            Entrar
          </Link>
        )}
      </div>
    </div>
  );
}
