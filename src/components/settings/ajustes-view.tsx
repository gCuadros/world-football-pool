"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Loader2, Sun, Moon, Monitor, LogOut, Camera } from "lucide-react";
import { toast } from "sonner";

import {
  updateProfile,
  updateNotificationPrefs,
  type NotificationPrefs,
} from "@/app/(app)/ajustes/actions";
import { signOutAction } from "@/app/(app)/actions";
import { PushToggle } from "@/components/notifications/push-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Team = { name: string; flag: string | null };

const NOTIF_TYPES: {
  key: keyof Omit<NotificationPrefs, "followedTeams" | "notifyMatchStart" | "notifyMatchStartAll">;
  label: string;
  desc: string;
}[] = [
  { key: "notifyLiveGoals", label: "Goles en vivo", desc: "Cuando se marca en un partido que predijiste." },
  { key: "notifyResults", label: "Resultados", desc: "Tus puntos al terminar un partido." },
  { key: "notifyReminders", label: "Recordatorios", desc: "Avisos para predecir antes del cierre." },
  { key: "notifyLeague", label: "Ligas", desc: "Ranking y nuevos miembros." },
];

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 text-left motion-safe:active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="text-muted-foreground block text-xs">{desc}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function initialsOf(name: string, email: string): string {
  const base = name.trim() || email;
  return base
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Comprime una imagen a base64 (máx 200×200, calidad 0.75, ~15-25KB). */
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 200;
      const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas no disponible"));
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = url;
  });
}

export function AjustesView({
  initialName,
  initialTeam,
  initialAvatar,
  teams,
  email,
  initialPrefs,
}: {
  initialName: string;
  initialTeam: string | null;
  initialAvatar: string | null;
  teams: Team[];
  email: string;
  initialPrefs: NotificationPrefs;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [team, setTeam] = useState(initialTeam ?? "");
  const [avatar, setAvatar] = useState<string | null>(initialAvatar);
  const [pending, start] = useTransition();
  const [signingOut, startSignOut] = useTransition();
  const { theme, setTheme } = useTheme();

  // Preferencias de notificación.
  const [prefs, setPrefs] = useState({
    notifyLiveGoals: initialPrefs.notifyLiveGoals,
    notifyResults: initialPrefs.notifyResults,
    notifyReminders: initialPrefs.notifyReminders,
    notifyLeague: initialPrefs.notifyLeague,
    notifyMatchStart: initialPrefs.notifyMatchStart,
    notifyMatchStartAll: initialPrefs.notifyMatchStartAll,
  });
  const [followed, setFollowed] = useState<Set<string>>(
    () => new Set(initialPrefs.followedTeams),
  );
  const [savingPrefs, startSavePrefs] = useTransition();

  function toggleTeam(name: string) {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function savePrefs() {
    startSavePrefs(async () => {
      const res = await updateNotificationPrefs({
        ...prefs,
        followedTeams: [...followed],
      });
      if (res.ok) {
        toast.success("Preferencias guardadas");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  const dirty = name !== initialName || team !== (initialTeam ?? "") || avatar !== initialAvatar;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      // Validar tamaño (~75KB máx en base64)
      if (compressed.length > 100_000) {
        toast.error("La imagen es demasiado grande. Intenta con una más pequeña.");
        return;
      }
      setAvatar(compressed);
    } catch {
      toast.error("No se pudo procesar la imagen.");
    }
  }

  function handleSave() {
    start(async () => {
      const res = await updateProfile(name, team || null, avatar);
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
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="size-14 rounded-full object-cover"
                />
              ) : (
                <div className="bg-primary flex size-14 items-center justify-center rounded-full font-mono text-lg font-bold text-white">
                  {initialsOf(name, email)}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="bg-card border-border absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full border shadow-sm transition-opacity hover:opacity-80"
                title="Cambiar foto"
              >
                <Camera className="size-3" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate font-mono text-lg font-bold">
                {name || "Sin nombre"}
              </h2>
              <p className="text-muted-foreground truncate text-sm">{email}</p>
              {avatar && avatar !== initialAvatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(initialAvatar)}
                  className="text-muted-foreground mt-1 text-xs underline underline-offset-2"
                >
                  Descartar foto
                </button>
              )}
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
          <section className="border-border bg-card space-y-5 rounded-2xl border p-5">
            <div>
              <h2 className="mb-1 font-bold">Notificaciones</h2>
              <p className="text-muted-foreground text-sm">
                Activa en este dispositivo y elige qué quieres recibir.
              </p>
            </div>

            <PushToggle />

            {/* Tipos de aviso */}
            <div className="border-border space-y-3 border-t pt-4">
              <h3 className="text-muted-foreground font-mono text-2xs font-semibold tracking-wide uppercase">
                Qué recibir
              </h3>
              {NOTIF_TYPES.map((t) => (
                <ToggleRow
                  key={t.key}
                  label={t.label}
                  desc={t.desc}
                  checked={prefs[t.key]}
                  onChange={(v) => setPrefs((p) => ({ ...p, [t.key]: v }))}
                />
              ))}
              <ToggleRow
                label="Antes del partido"
                desc="Aviso ~20 min antes del kickoff."
                checked={prefs.notifyMatchStart}
                onChange={(v) => setPrefs((p) => ({ ...p, notifyMatchStart: v }))}
              />
              {prefs.notifyMatchStart && (
                <div className="flex gap-2 pl-1">
                  {[
                    { value: false, label: "Solo si no he predicho" },
                    { value: true, label: "Todos los partidos" },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setPrefs((p) => ({ ...p, notifyMatchStartAll: opt.value }))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition motion-safe:active:scale-[0.97]",
                        prefs.notifyMatchStartAll === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Equipos a seguir */}
            <div className="border-border space-y-3 border-t pt-4">
              <div>
                <h3 className="text-muted-foreground font-mono text-2xs font-semibold tracking-wide uppercase">
                  Equipos a seguir
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {followed.size === 0
                    ? "Recibes avisos de todos los partidos."
                    : `Solo avisos de ${followed.size} ${followed.size === 1 ? "equipo" : "equipos"}.`}
                </p>
              </div>
              <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
                {teams.map((t) => {
                  const on = followed.has(t.name);
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => toggleTeam(t.name)}
                      aria-pressed={on}
                      className={cn(
                        "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition motion-safe:active:scale-[0.97]",
                        on
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {t.flag ? <span>{t.flag}</span> : null}
                      <span className="truncate">{t.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFollowed(new Set(teams.map((t) => t.name)))}
                  className="text-muted-foreground text-xs underline underline-offset-2"
                >
                  Seguir todos
                </button>
                {followed.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setFollowed(new Set())}
                    className="text-muted-foreground text-xs underline underline-offset-2"
                  >
                    Quitar todos
                  </button>
                )}
              </div>
            </div>

            <Button onClick={savePrefs} disabled={savingPrefs} className="w-full">
              {savingPrefs ? <Loader2 className="size-4 animate-spin" /> : null}
              Guardar preferencias
            </Button>
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
