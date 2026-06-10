"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { LogOut, LogIn, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { titleForPath } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { signOutAction } from "@/app/(shell)/(app)/actions";
import { MobileNav } from "@/components/app/mobile-nav";
import { RefreshButton } from "@/components/app/refresh-button";
import type { SidebarUser } from "@/components/app/nav-content";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationVM } from "@/lib/notifications";

export type TopbarNotifications = {
  count: number;
  items: NotificationVM[];
};

export function Topbar({
  user,
  notifications,
}: {
  user: SidebarUser;
  notifications?: TopbarNotifications;
}) {
  const pathname = usePathname();
  const title = titleForPath(pathname);
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  return (
    <header
      className="border-border/30 dark:border-white/5 bg-background/80 vt-topbar sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b px-3 backdrop-blur-2xl sm:gap-4 sm:px-4 lg:px-6 shadow-[0_1px_0_0_rgba(255,255,255,0.04)]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <MobileNav user={user} />
      <div className="min-w-0">
        <p className="text-muted-foreground/70 hidden font-mono text-2xs tracking-widest uppercase sm:block">
          Mundial 2026
        </p>
        <h1 className="truncate text-base leading-none font-bold tracking-tight sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Actualizar (solo móvil): gesto de refresco tipo PWA. */}
        <RefreshButton className="lg:hidden" />

        <Button
          variant="ghost"
          size="icon"
          aria-label="Cambiar tema"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 dark:hidden" />
          <Moon className="hidden size-4 dark:block" />
        </Button>

        {user.isLoggedIn && notifications && (
          <NotificationBell
            count={notifications.count}
            items={notifications.items}
          />
        )}

        {user.isLoggedIn ? (
          <>
            {/* Salir solo en desktop: en móvil vive en Perfil (ajustes). */}
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => startTransition(() => signOutAction())}
              className="hidden lg:inline-flex"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
            {/* Badge de perfil: avatar → ajustes, como una app nativa. */}
            <Link
              href="/ajustes"
              aria-label="Tu perfil"
              className="ring-border hover:ring-primary/50 ml-0.5 rounded-full ring-2 transition-shadow"
            >
              <Avatar className="size-8">
                <AvatarImage
                  src={
                    user.avatar?.startsWith("data:") || user.avatar?.startsWith("http")
                      ? user.avatar
                      : "/avatar-default.webp"
                  }
                />
              </Avatar>
            </Link>
          </>
        ) : (
          <Button variant="default" size="sm" render={<Link href="/login" />}>
            <LogIn className="size-4" />
            <span className="hidden sm:inline">Entrar</span>
          </Button>
        )}
      </div>
    </header>
  );
}
