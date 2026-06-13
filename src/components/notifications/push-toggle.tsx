"use client";

// Detección de capacidades de push solo disponible en el cliente: setState en el
// effect de montaje es intencional (sincronizar con APIs del navegador).
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

import {
  isPushSupported,
  isIOS,
  isStandalone,
  getPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
  ensurePushSubscribed,
} from "@/lib/push-client";
import { Button } from "@/components/ui/button";

// Email del responsable: el botón de prueba es una herramienta de
// diagnóstico, no una función de producto — solo se muestra para él.
const DIAGNOSTICS_EMAIL = "gonzalo.cuadros@gmail.com";

export function PushToggle({ email }: { email?: string }) {
  const canTest = email === DIAGNOSTICS_EMAIL;
  const [state, setState] = useState<
    "loading" | "unsupported" | "ios-install" | "default" | "granted" | "denied"
  >("loading");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isPushSupported()) {
      // iOS sin instalar: Safari no expone Push hasta instalar la PWA.
      if (isIOS() && !isStandalone()) setState("ios-install");
      else setState("unsupported");
      return;
    }
    const perm = getPermissionState();
    setState(perm === "unsupported" ? "unsupported" : perm);
  }, []);

  function enable() {
    startTransition(async () => {
      const ok = await subscribeToPush();
      if (ok) {
        setState("granted");
        toast.success("Notificaciones activadas");
      } else {
        setState(getPermissionState() === "denied" ? "denied" : "default");
        toast.error("No se pudieron activar las notificaciones");
      }
    });
  }

  function disable() {
    startTransition(async () => {
      await unsubscribeFromPush();
      setState("default");
      toast.success("Notificaciones desactivadas en este dispositivo");
    });
  }

  function sendTest() {
    startTransition(async () => {
      // Re-asegura la suscripción antes de probar (puede haber caducado).
      await ensurePushSubscribed().catch(() => {});
      try {
        const res = await fetch("/api/push/test", { method: "POST" });
        if (res.ok) {
          toast.success("Prueba enviada", {
            description: "Debería llegarte en unos segundos.",
          });
        } else if (res.status === 409) {
          toast.error("Este dispositivo no está suscrito", {
            description: "Desactiva y vuelve a activar las notificaciones.",
          });
        } else {
          toast.error("No se pudo enviar la prueba");
        }
      } catch {
        toast.error("No se pudo enviar la prueba");
      }
    });
  }

  if (state === "loading") {
    return <div className="bg-muted h-10 w-full animate-pulse rounded-lg" />;
  }

  if (state === "ios-install") {
    return (
      <div className="text-muted-foreground flex items-start gap-2 text-sm">
        <Smartphone className="mt-0.5 size-4 shrink-0" />
        <span>
          En iPhone, añade la app a la pantalla de inicio (Compartir → «Añadir a
          inicio») para poder recibir notificaciones.
        </span>
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <p className="text-muted-foreground text-sm">
        Tu navegador no admite notificaciones push.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-muted-foreground text-sm">
        Has bloqueado las notificaciones. Actívalas desde los ajustes del navegador.
      </p>
    );
  }

  if (state === "granted") {
    return (
      <div className="flex flex-wrap gap-2">
        {canTest && (
          <Button variant="outline" onClick={sendTest} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
            Enviar prueba
          </Button>
        )}
        <Button variant="ghost" onClick={disable} disabled={pending}>
          <BellOff className="size-4" />
          Desactivar en este dispositivo
        </Button>
      </div>
    );
  }

  // default
  return (
    <Button onClick={enable} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
      Activar notificaciones
    </Button>
  );
}
