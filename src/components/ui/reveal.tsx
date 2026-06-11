import { Suspense } from "react";

/**
 * Alias de <Suspense> (mismas props `fallback`/`children`).
 *
 * Antes envolvía skeleton y contenido en <ViewTransition> para animar el
 * revelado, pero cada transición congela la pantalla mientras captura
 * snapshots del viewport y encola los taps durante la animación: sumada a
 * la transición de ruta eran ~2 ciclos de captura por navegación y en móvil
 * se percibía como una app que no responde. El swap directo es instantáneo.
 */
export function Reveal({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}
