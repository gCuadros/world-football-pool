"use client";

import { useSyncExternalStore } from "react";
import { WifiSlash } from "@phosphor-icons/react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Píldora "Sin conexión" bajo el topbar mientras no hay red, como las apps
 * nativas. useSyncExternalStore: SSR siempre "online" (sin mismatch de
 * hidratación) y re-render automático con los eventos online/offline.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );

  if (online) return null;

  return (
    <div
      role="status"
      className="bg-amber-500/15 text-amber-600 dark:text-amber-400 mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full border border-amber-500/30 px-3 py-1 text-xs font-medium"
    >
      <WifiSlash className="size-3.5" weight="bold" />
      Sin conexión — mostrando lo último disponible
    </div>
  );
}
