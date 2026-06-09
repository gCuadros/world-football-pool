"use client";

import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

/** Distancia de arrastre (ya amortiguada) que dispara el refresco. */
const THRESHOLD = 64;
/** Tope visual del indicador. */
const MAX_PULL = 96;
/** Resistencia: px de indicador por px de dedo. */
const DAMPING = 0.45;

function subscribeNoop() {
  return () => {};
}

function isStandaloneTouch() {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS marca las web apps añadidas a inicio con `navigator.standalone`.
    ("standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true);
  return standalone && "ontouchstart" in window;
}

/**
 * Pull-to-refresh para la PWA instalada. En standalone el navegador no ofrece
 * el gesto nativo de recarga, así que lo reponemos nosotros: tirar hacia abajo
 * desde el tope de la página revela un indicador y, pasado el umbral, hace
 * `router.refresh()` (datos frescos del servidor sin recargar la página).
 *
 * Solo se activa en `(display-mode: standalone)` con pantalla táctil; en
 * navegador móvil normal el gesto nativo del browser sigue funcionando y aquí
 * no interferimos.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  // `false` en servidor/hidratación; el valor real en cliente sin re-render
  // extra ni setState-en-efecto. El display-mode no cambia en vivo → no-op sub.
  const enabled = useSyncExternalStore(
    subscribeNoop,
    isStandaloneTouch,
    () => false,
  );

  function onTouchStart(e: React.TouchEvent) {
    if (!enabled || refreshing) return;
    // Solo arranca el gesto si el documento está en el tope.
    startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    armed.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0 || window.scrollY > 0) {
      setPull(0);
      setDragging(false);
      return;
    }
    setDragging(true);
    const next = Math.min(dy * DAMPING, MAX_PULL);
    setPull(next);
    if (next >= THRESHOLD && !armed.current) {
      armed.current = true;
      haptics.tap();
    } else if (next < THRESHOLD && armed.current) {
      armed.current = false;
    }
  }

  function onTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;
    setDragging(false);
    if (armed.current && !refreshing) {
      armed.current = false;
      startTransition(() => router.refresh());
    }
    setPull(0);
  }

  const height = refreshing ? 48 : pull;
  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      onTouchStart={enabled ? onTouchStart : undefined}
      onTouchMove={enabled ? onTouchMove : undefined}
      onTouchEnd={enabled ? onTouchEnd : undefined}
      onTouchCancel={enabled ? onTouchEnd : undefined}
    >
      {/* Banda del indicador: empuja el contenido como en una app nativa. */}
      <div
        aria-hidden={height === 0}
        className={cn(
          "flex items-end justify-center overflow-hidden",
          !dragging && "transition-[height] duration-300 ease-out",
        )}
        style={{ height }}
      >
        <div
          className={cn(
            "bg-card border-border/60 mb-2 flex size-8 items-center justify-center rounded-full border shadow-sm",
            !refreshing && "transition-opacity",
          )}
          style={{ opacity: refreshing ? 1 : progress }}
        >
          <RefreshCw
            className={cn(
              "size-4",
              refreshing ? "text-primary animate-spin" : "text-muted-foreground",
            )}
            style={
              refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }
            }
          />
        </div>
      </div>
      {children}
    </div>
  );
}
