"use client";

import { useEffect } from "react";

/**
 * Badge en el icono de la app instalada (App Badging API): el número de
 * predicciones pendientes, como el contador de no leídos de una app de
 * mensajería. Soportado en la PWA instalada (iOS 16.4+, Android/Chrome,
 * desktop); en navegador normal no hace nada.
 */
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    if (!("setAppBadge" in navigator)) return;
    if (count > 0) {
      navigator.setAppBadge(count).catch(() => {});
    } else {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [count]);

  return null;
}
