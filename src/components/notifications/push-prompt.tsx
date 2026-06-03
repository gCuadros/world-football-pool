"use client";

// Detección de capacidades de push solo disponible en el cliente: setState en el
// effect de montaje es intencional (sincronizar con APIs del navegador).
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useTransition } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { toast } from "sonner";

import {
  isPushSupported,
  isIOS,
  isStandalone,
  getPermissionState,
  subscribeToPush,
} from "@/lib/push-client";

const DISMISS_KEY = "push-prompt-dismissed";

/**
 * Banner de onboarding que invita a activar notificaciones. Se oculta si ya hay
 * permiso/denegado o si el usuario lo pospone. En iOS sin instalar, muestra la
 * instrucción de "Añadir a pantalla de inicio".
 */
export function PushPrompt() {
  const [mode, setMode] = useState<"hidden" | "enable" | "ios-install">("hidden");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    if (!isPushSupported()) {
      if (isIOS() && !isStandalone()) setMode("ios-install");
      return;
    }
    if (getPermissionState() === "default") setMode("enable");
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
  }

  function enable() {
    startTransition(async () => {
      const ok = await subscribeToPush();
      if (ok) {
        toast.success("Notificaciones activadas");
        dismiss();
      } else {
        toast.error("No se pudieron activar");
      }
    });
  }

  if (mode === "hidden") return null;

  return (
    <div className="border-primary/30 bg-primary/5 flex items-center gap-4 rounded-2xl border p-4">
      <div className="bg-primary/10 flex size-11 shrink-0 items-center justify-center rounded-xl">
        {mode === "ios-install" ? (
          <Smartphone className="text-primary size-5" />
        ) : (
          <Bell className="text-primary size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">No te pierdas nada del Mundial</p>
        <p className="text-muted-foreground text-xs">
          {mode === "ios-install"
            ? "En iPhone, añade la app a inicio (Compartir → «Añadir a inicio») para recibir avisos."
            : "Recibe avisos de goles, resultados y recordatorios de tus predicciones."}
        </p>
      </div>
      {mode === "enable" && (
        <button
          onClick={enable}
          disabled={pending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {pending ? "Activando…" : "Activar"}
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
