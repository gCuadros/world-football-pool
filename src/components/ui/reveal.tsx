import { Suspense, ViewTransition } from "react";

/**
 * Suspense con transición de revelado: al resolverse, el skeleton sale
 * (slide-down + fade) y el contenido entra (slide-up + fade) en lugar de un
 * cambio brusco. Drop-in de `<Suspense>` (mismas props `fallback`/`children`).
 *
 * `default="none"` evita que el contenido se anime durante el cross-fade de
 * ruta del shell; solo anima en su propio "enter" al resolver el Suspense.
 * Las clases `reveal-in`/`reveal-out` se estilan en globals.css y respetan
 * `prefers-reduced-motion`.
 */
export function Reveal({
  fallback,
  children,
}: {
  fallback: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ViewTransition exit="reveal-out">{fallback}</ViewTransition>}>
      <ViewTransition enter="reveal-in" default="none">
        {children}
      </ViewTransition>
    </Suspense>
  );
}
