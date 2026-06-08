"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Plus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { createLeague, joinLeague } from "@/app/(app)/mini-ligas/actions";

// Botones de cabecera "Unirse con código" / "Nueva liga" + panel de formulario.
// Diseño: topbar de la pantalla 08 "Mis Ligas".
export function LigasActions() {
  const [mode, setMode] = useState<"idle" | "join" | "create">("idle");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleJoin() {
    startTransition(async () => {
      const res = await joinLeague(code);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`¡Te has unido a ${res.code}!`);
      router.push(`/liga/${res.leagueId}`);
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const res = await createLeague(name);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`¡Liga creada! Código: ${res.code}`);
      router.push(`/liga/${res.leagueId}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <button
          onClick={() => setMode((m) => (m === "join" ? "idle" : "join"))}
          className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/70 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        >
          <LogIn className="size-4" />
          Unirse con código
        </button>
        <button
          onClick={() => setMode((m) => (m === "create" ? "idle" : "create"))}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
        >
          <Plus className="size-4" />
          Nueva liga
        </button>
      </div>

      {mode !== "idle" && (
        <div className="border-border bg-card relative space-y-3 rounded-2xl border p-5">
          <button
            onClick={() => setMode("idle")}
            aria-label="Cerrar"
            className="text-muted-foreground hover:text-foreground absolute top-4 right-4"
          >
            <X className="size-4" />
          </button>
          {mode === "join" ? (
            <>
              <h3 className="font-semibold">Unirse con código</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="CÓDIGO"
                  autoFocus
                  className="border-border bg-background focus:border-primary h-11 flex-1 rounded-xl border px-4 font-mono tracking-[0.3em] uppercase outline-none transition-colors placeholder:tracking-normal"
                />
                <button
                  onClick={handleJoin}
                  disabled={pending || code.length !== 6}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Unirse
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-semibold">Nueva liga</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  placeholder="Nombre de tu liga…"
                  autoFocus
                  className="border-border bg-background focus:border-primary h-11 flex-1 rounded-xl border px-4 outline-none transition-colors"
                />
                <button
                  onClick={handleCreate}
                  disabled={pending || name.trim().length < 3}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Crear
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
