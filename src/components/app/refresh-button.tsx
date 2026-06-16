"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import { refreshMatchesCache } from "@/components/app/refresh-action";

/**
 * Botón de actualizar del topbar (gesto tipo "pull to refresh" de una PWA).
 * Invalida la caché de partidos y luego refresca: `router.refresh()` solo NO
 * rompe el `use cache`, así que sin esto no traía marcadores en vivo nuevos.
 */
export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Actualizar"
      disabled={pending}
      onClick={() => {
        haptics.tap();
        start(async () => {
          await refreshMatchesCache();
          router.refresh();
        });
      }}
      className={className}
    >
      <ArrowsClockwise className={cn("size-4", pending && "animate-spin")} weight="bold" />
    </Button>
  );
}
