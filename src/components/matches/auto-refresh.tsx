"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca los datos del servidor periódicamente para traer marcadores en vivo
 * actualizados, sin recargar la página. Solo activo si hay partidos en directo.
 *
 * El refresh va dentro de `startTransition`: React mantiene la UI actual
 * mientras llega la nueva en vez de colapsar los Suspense a sus fallbacks
 * (sin esto, cada tick hacía parpadear el shell y desaparecer el menú).
 */
export function AutoRefresh({
  intervalMs = 60_000,
  enabled = true,
}: {
  intervalMs?: number;
  enabled?: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      startTransition(() => router.refresh());
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, enabled]);

  return null;
}
