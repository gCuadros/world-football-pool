"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";

/**
 * Botón "atrás" que vuelve a la página de ORIGEN de la navegación
 * (router.back), no a una ruta fija: desde /partidos → equipo, atrás
 * vuelve a /partidos; desde /mundial → equipo, vuelve a /mundial.
 *
 * `fallback`: destino cuando no hay historial al que volver (deep link,
 * pestaña nueva, primera página de la sesión).
 */
export function BackButton({
  label = "Atrás",
  fallback = "/",
  className = "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors",
}: {
  label?: string;
  fallback?: string;
  className?: string;
} = {}) {
  const router = useRouter();

  return (
    <button
      onClick={() => {
        // router.back() no acepta transitionTypes (anima con morph + fade);
        // el fallback sí desliza hacia atrás.
        if (window.history.length > 1) router.back();
        else router.push(fallback, { transitionTypes: ["nav-back"] });
      }}
      className={className}
      type="button"
    >
      <ArrowLeft className="size-4" />
      {label}
    </button>
  );
}
