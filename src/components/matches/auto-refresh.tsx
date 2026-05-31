"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Refresca los datos del servidor periódicamente para traer marcadores en vivo
 * actualizados, sin recargar la página. Solo activo si hay partidos en directo.
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
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, enabled]);

  return null;
}
