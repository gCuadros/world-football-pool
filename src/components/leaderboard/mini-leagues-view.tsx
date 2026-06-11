"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, LogIn, Copy, Users, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { LeagueVM, LeaderboardRow } from "@/lib/leaderboard";
type MiniLeagueVM = LeagueVM & { rows: LeaderboardRow[] };
import { createLeague, joinLeague } from "@/app/(shell)/(app)/mini-ligas/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";

export function MiniLeaguesView({ leagues }: { leagues: MiniLeagueVM[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creating, startCreate] = useTransition();
  const [joining, startJoin] = useTransition();

  function handleCreate() {
    startCreate(async () => {
      const res = await createLeague(name);
      if (res.ok) {
        toast.success(`Liga creada · código ${res.code}`);
        setName("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function handleJoin() {
    startJoin(async () => {
      const res = await joinLeague(code);
      if (res.ok) {
        toast.success(`Te uniste a "${res.code}"`);
        setCode("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function copyCode(value: string) {
    navigator.clipboard?.writeText(value);
    toast.success(`Código ${value} copiado`);
  }

  return (
    <div className="space-y-6">
      {/* Crear / unirse */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card-glass rounded-2xl p-4">
          <h3 className="mb-1 flex items-center gap-2 font-bold">
            <Plus className="text-primary size-4" /> Crear mini-liga
          </h3>
          <p className="text-muted-foreground mb-3 text-xs">
            Crea una liga privada e invita a tus amigos con el código.
          </p>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre de la liga"
              maxLength={40}
              onKeyDown={(e) => e.key === "Enter" && name && handleCreate()}
            />
            <Button onClick={handleCreate} disabled={creating || name.length < 3}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : "Crear"}
            </Button>
          </div>
        </div>

        <div className="card-glass rounded-2xl p-4">
          <h3 className="mb-1 flex items-center gap-2 font-bold">
            <LogIn className="text-primary size-4" /> Unirse con código
          </h3>
          <p className="text-muted-foreground mb-3 text-xs">
            Introduce el código de 6 caracteres que te han compartido.
          </p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="P. ej. MUND26"
              maxLength={6}
              className="font-mono uppercase"
              onKeyDown={(e) => e.key === "Enter" && code && handleJoin()}
            />
            <Button
              variant="secondary"
              onClick={handleJoin}
              disabled={joining || code.length !== 6}
            >
              {joining ? <Loader2 className="size-4 animate-spin" /> : "Unirse"}
            </Button>
          </div>
        </div>
      </div>

      {/* Mis ligas */}
      {leagues.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-xl border border-dashed p-10 text-center text-sm">
          Aún no perteneces a ninguna mini-liga. Crea una o únete con un código.
        </div>
      ) : (
        <div className="space-y-5">
          {leagues.map((league) => (
            <div key={league.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="flex items-center gap-2 text-base font-bold">
                  {league.name}
                  {league.isOwner ? (
                    <Crown className="text-primary size-4" />
                  ) : null}
                </h3>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Users className="size-3.5" /> {league.memberCount}
                </span>
                <button
                  type="button"
                  onClick={() => copyCode(league.inviteCode)}
                  className="border-border text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-xs transition-colors"
                >
                  {league.inviteCode}
                  <Copy className="size-3" />
                </button>
              </div>
              <LeaderboardTable rows={league.rows} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
