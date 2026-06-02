"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Hash } from "lucide-react";
import { toast } from "sonner";

import { createLeague, joinLeague } from "@/app/(app)/mini-ligas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LigasActions() {
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

  if (mode === "create") {
    return (
      <div className="border-border bg-card space-y-4 rounded-xl border p-5">
        <h3 className="font-semibold">Nueva liga</h3>
        <div className="space-y-2">
          <Label htmlFor="league-name">Nombre de la liga</Label>
          <Input
            id="league-name"
            placeholder="p. ej. Liga de la Oficina"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCreate}
            disabled={isPending || name.trim().length < 3}
            className="flex-1"
          >
            {isPending ? "Creando…" : "Crear liga"}
          </Button>
          <Button variant="outline" onClick={() => setMode("idle")} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="border-border bg-card space-y-4 rounded-xl border p-5">
        <h3 className="font-semibold">Unirse con código</h3>
        <div className="space-y-2">
          <Label htmlFor="league-code">Código de invitación (6 caracteres)</Label>
          <Input
            id="league-code"
            placeholder="p. ej. MUND26"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="font-mono tracking-widest uppercase"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleJoin}
            disabled={isPending || code.length !== 6}
            className="flex-1"
          >
            {isPending ? "Uniéndome…" : "Unirse"}
          </Button>
          <Button variant="outline" onClick={() => setMode("idle")} disabled={isPending}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        onClick={() => setMode("join")}
        className="border-border bg-card hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-4 text-left transition-colors"
      >
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Hash className="text-primary size-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">Unirse con código</p>
          <p className="text-muted-foreground text-xs">Tengo un código de invitación</p>
        </div>
      </button>
      <button
        onClick={() => setMode("create")}
        className="border-border bg-card hover:bg-muted/50 flex items-center gap-3 rounded-xl border p-4 text-left transition-colors"
      >
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Plus className="text-primary size-5" />
        </div>
        <div>
          <p className="font-semibold text-sm">Crear liga</p>
          <p className="text-muted-foreground text-xs">Invita a tus amigos con un código</p>
        </div>
      </button>
    </div>
  );
}
