"use client";

import { useEffect } from "react";

import { isPushSupported, ensurePushSubscribed } from "@/lib/push-client";

/**
 * Registra el service worker al cargar y, si el permiso de notificaciones ya
 * está concedido, re-sincroniza la suscripción Web Push. Esto es lo que hace
 * que la PWA instalada (contexto separado del navegador) registre su propia
 * suscripción la primera vez que se abre, en vez de quedarse sin push.
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    // Registro del SW siempre (para poder recibir push).
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    // Si ya hay permiso, asegura que ESTE contexto tenga suscripción en el server.
    if (isPushSupported() && Notification.permission === "granted") {
      ensurePushSubscribed().catch(() => {});
    }
  }, []);

  return null;
}
