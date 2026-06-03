"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Loader2, Sun, Moon, Monitor, LogOut } from "lucide-react";
import { toast } from "sonner";

import { updateProfile } from "@/app/(app)/ajustes/actions";
import { signOutAction } from "@/app/(app)/actions";
import { PushToggle } from "@/components/notifications/push-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Team = { name: string; flag: string | null };

function initialsOf(name: string, email: string): string {
  const base = name.trim() || email;
  return base
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AjustesView({
  initialName,
  initialTeam,
  teams,
  email,
}: {
  initialName: string;
  initialTeam: string | null;
  teams: Team[];
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [team, setTeam] = useState(initialTeam ?? "");
  const [pending, start] = useTransition();
  const [signingOut, startSignOut] = useTransition();
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Columna principal: perfil + info */}
        <div className="space-y-6">
          {/* Tarjeta de perfil */}
          <section className="border-border bg-card flex items-center gap-4 rounded-2xl border p-5">
            <div className="bg-primary flex size-14 shrink-0 items-center justify-center rounded-full font-mono text-lg font-bold text-white">
              {initialsOf(name, email)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-mono text-lg font-bold">
                {name || "Sin nombre"}
              </h2>
              <p className="text-muted-foreground truncate text-sm">{email}</p>
            </div>
          </section>

          {/* Información personal */}
          <section className="border-border bg-card space-y-4 rounded-2xl border p-5">
            <h2 className="font-bold">Información personal</h2>
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
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-[3px]"
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
          </section>
        </div>

        {/* Columna lateral: apariencia + zona de peligro */}
        <div className="space-y-6">
          <section className="border-border bg-card rounded-2xl border p-5">
            <h2 className="mb-1 font-bold">Tema</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Apariencia de la aplicación.
            </p>
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
                      "flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition-colors",
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

          {/* Notificaciones */}
          <section className="border-border bg-card rounded-2xl border p-5">
            <h2 className="mb-1 font-bold">Notificaciones</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Recibe avisos de goles, resultados y recordatorios en este dispositivo.
            </p>
            <PushToggle />
          </section>

          {/* Zona de peligro */}
          <section className="border-destructive/30 bg-destructive/5 rounded-2xl border p-5">
            <h2 className="text-destructive mb-1 font-bold">Zona de peligro</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Cierra tu sesión en este dispositivo.
            </p>
            <Button
              variant="outline"
              disabled={signingOut}
              onClick={() => startSignOut(() => signOutAction())}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 w-full"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
