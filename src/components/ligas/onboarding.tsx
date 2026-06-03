"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trophy, LogIn, Plus, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createLeague, joinLeague } from "@/app/(app)/mini-ligas/actions";

// Onboarding (usuario sin ligas): hero + tarjetas Unirse / Crear.
// Diseño: pantalla 07 "Onboarding".
export function Onboarding() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

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
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-7 py-8 text-center sm:py-14">
      {/* Badge */}
      <span className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold tracking-[0.15em]">
        <Trophy className="size-3.5" />
        FIFA WORLD CUP 2026 · USA · CANADA · MEXICO
      </span>

      <div className="space-y-4">
        <h1 className="font-mono text-4xl font-bold tracking-tight sm:text-5xl">
          Predice. Compite. Celebra.
        </h1>
        <p className="text-muted-foreground mx-auto max-w-lg text-base leading-relaxed">
          Para participar en la quiniela necesitas estar en una liga. Únete con un
          código o crea la tuya propia.
        </p>
      </div>

      {/* Tarjetas */}
      <div className="grid w-full gap-5 sm:grid-cols-2">
        {/* Unirse */}
        <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6 text-left">
          <div className="flex items-center gap-3">
            <div className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-xl">
              <LogIn className="text-primary size-5" />
            </div>
            <div>
              <p className="font-semibold">Únete a una liga</p>
              <p className="text-muted-foreground text-xs">Con el código de un amigo</p>
            </div>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="CÓDIGO"
            className="border-border bg-background focus:border-primary h-12 rounded-xl border px-4 font-mono tracking-[0.3em] uppercase outline-none transition-colors placeholder:tracking-normal placeholder:normal-case"
          />
          <button
            onClick={handleJoin}
            disabled={pending || code.length !== 6}
            className="bg-secondary text-secondary-foreground border-border hover:bg-secondary/70 flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Unirse a la liga
            <ArrowRight className="size-4" />
          </button>
        </div>

        {/* Crear */}
        <div className="bg-primary text-primary-foreground flex flex-col gap-4 rounded-2xl p-6 text-left">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Plus className="size-5 text-white" />
            </div>
            <div>
              <p className="font-semibold">Crea tu liga</p>
              <p className="text-xs text-white/70">Invita a quien quieras</p>
            </div>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Nombre de tu liga…"
            className="h-12 rounded-xl border border-white/30 bg-white/15 px-4 text-white outline-none transition-colors placeholder:text-white/60 focus:border-white/60"
          />
          <button
            onClick={handleCreate}
            disabled={pending || name.trim().length < 3}
            className="text-primary flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold transition-colors hover:bg-white/90 disabled:opacity-50"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Crear liga
            <ArrowRight className="size-4" />
          </button>
          <p className="text-center text-[11px] text-white/70">
            Gratis · Sin límite · Código único de invitación
          </p>
        </div>
      </div>
    </div>
  );
}
