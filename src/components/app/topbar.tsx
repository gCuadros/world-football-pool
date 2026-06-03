"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { LogOut, LogIn, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { titleForPath } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(app)/actions";
import { MobileNav } from "@/components/app/mobile-nav";
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
    <header className="border-border bg-background/80 sticky top-0 z-20 flex h-16 items-center gap-2 border-b px-3 backdrop-blur sm:gap-4 sm:px-4 lg:px-6">
      <MobileNav user={user} />
      <div className="min-w-0">
        <p className="text-muted-foreground hidden font-mono text-[11px] tracking-wide uppercase sm:block">
          Mundial 2026
        </p>
        <h1 className="truncate text-base leading-none font-bold sm:text-lg">
          {title}
        </h1>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
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
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => signOutAction())}
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
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
