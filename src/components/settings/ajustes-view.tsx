"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Loader2, Sun, Moon, Monitor } from "lucide-react";
import { toast } from "sonner";

import { updateProfile } from "@/app/(app)/ajustes/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Team = { name: string; flag: string | null };

export function AjustesView({
  initialName,
  initialTeam,
  teams,
}: {
  initialName: string;
  initialTeam: string | null;
  teams: Team[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [team, setTeam] = useState(initialTeam ?? "");
  const [pending, start] = useTransition();
  const { theme, setTheme } = useTheme();

  const dirty = name !== initialName || team !== (initialTeam ?? "");

  function handleSave() {
    start(async () => {
      const res = await updateProfile(name, team || null);
      if (res.ok) {
        toast.success("Perfil actualizado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const themes = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Oscuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Perfil */}
      <section className="border-border bg-card rounded-2xl border p-5">
        <h2 className="mb-1 font-bold">Perfil</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Tu nombre y equipo favorito.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team">Equipo favorito</Label>
            <select
              id="team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-[3px]"
            >
              <option value="">Sin equipo favorito</option>
              {teams.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.flag ? `${t.flag} ` : ""}
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleSave} disabled={pending || !dirty}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Guardar cambios
          </Button>
        </div>
      </section>

      {/* Apariencia */}
      <section className="border-border bg-card rounded-2xl border p-5">
        <h2 className="mb-1 font-bold">Apariencia</h2>
        <p className="text-muted-foreground mb-4 text-sm">Tema de la aplicación.</p>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            const active = theme === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                <Icon className="size-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
