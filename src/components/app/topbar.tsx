"use client";

import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Search, Bell, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { titleForPath } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOutAction } from "@/app/(app)/actions";

export function Topbar() {
  const pathname = usePathname();
  const title = titleForPath(pathname);
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  return (
    <header className="border-border bg-background/80 sticky top-0 z-20 flex h-16 items-center gap-4 border-b px-4 backdrop-blur lg:px-6">
      <div className="min-w-0">
        <p className="text-muted-foreground font-mono text-[11px] tracking-wide uppercase">
          Mundial 2026
        </p>
        <h1 className="truncate text-lg leading-none font-bold">{title}</h1>
      </div>

      <div className="relative ml-auto hidden max-w-xs flex-1 sm:block">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          placeholder="Buscar partidos o equipos…"
          className="bg-card pl-9"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Cambiar tema"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Notificaciones"
        className="relative"
      >
        <Bell className="size-4" />
        <span className="bg-live absolute top-2 right-2 size-2 rounded-full" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => signOutAction())}
      >
        <LogOut className="size-4" />
        <span className="hidden sm:inline">Salir</span>
      </Button>
    </header>
  );
}
