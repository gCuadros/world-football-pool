"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowsClockwise } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

/**
 * Refresca los datos del servidor de la ruta actual (`router.refresh()`) con un
 * spinner mientras está en curso. Pensado para el topbar en móvil, como gesto
 * de actualización tipo "pull to refresh" de una PWA.
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
        start(() => router.refresh());
      }}
      className={className}
    >
      <ArrowsClockwise className={cn("size-4", pending && "animate-spin")} weight="bold" />
    </Button>
  );
}
