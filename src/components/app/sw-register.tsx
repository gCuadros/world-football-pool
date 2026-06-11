"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { isPushSupported, ensurePushSubscribed } from "@/lib/push-client";

/**
 * Registra el service worker al cargar y, si el permiso de notificaciones ya
 * está concedido, re-sincroniza la suscripción Web Push. Esto es lo que hace
 * que la PWA instalada (contexto separado del navegador) registre su propia
 * suscripción la primera vez que se abre, en vez de quedarse sin push.
 *
 * Además gestiona el ciclo de actualización del SW: cuando hay una versión
 * nueva instalada y a la espera, muestra un toast con acción "Actualizar" que
 * activa la versión nueva (SKIP_WAITING) y recarga la app.
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // En dev el SW solo estorba: cachear chunks de Turbopack (mismo nombre,
    // contenido distinto) congela CSS/JS rancios. Además de no registrar, se
    // limpia cualquier SW/caché que quedara de sesiones anteriores.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => keys.forEach((k) => caches.delete(k)))
          .catch(() => {});
      }
      return;
    }

    const promptUpdate = (worker: ServiceWorker) => {
      toast("Nueva versión disponible", {
        description: "Actualiza para tener las últimas mejoras.",
        duration: Infinity,
        action: {
          label: "Actualizar",
          onClick: () => worker.postMessage({ type: "SKIP_WAITING" }),
        },
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Versión nueva ya esperando (la app llevaba abierta desde antes).
        if (reg.waiting && navigator.serviceWorker.controller) {
          promptUpdate(reg.waiting);
        }
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            // `controller` distingue actualización de primera instalación.
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              promptUpdate(worker);
            }
          });
        });
      })
      .catch(() => {});

    // Al activarse la versión nueva, recarga para servir todo desde ella.
    // En la primera instalación (sin controller previo) no se recarga.
    let hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Si ya hay permiso, asegura que ESTE contexto tenga suscripción en el server.
    if (isPushSupported() && Notification.permission === "granted") {
      ensurePushSubscribed().catch(() => {});
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
