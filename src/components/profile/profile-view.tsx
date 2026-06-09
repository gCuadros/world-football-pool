"use client";

import { useState } from "react";
import Image from "next/image";
import { Target, Zap, BarChart2, Star, ChevronDown } from "lucide-react";

import type { PublicProfile, PublicPrediction } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { BackButton } from "@/components/ui/back-button";

function isRealAvatar(a: string | null): boolean {
  return !!a && (a.startsWith("data:") || a.startsWith("http"));
}

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Madrid",
});

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-border bg-card flex flex-col items-center gap-1 rounded-xl border p-3 text-center">
      <Icon className="text-primary size-4" />
      <span className="text-lg font-bold font-mono">{value}</span>
      <span className="text-muted-foreground text-3xs uppercase tracking-wide">{label}</span>
    </div>
  );
}

export function ProfileView({
  profile,
  predictions,
}: {
  profile: PublicProfile;
  predictions: PublicPrediction[];
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? predictions : predictions.slice(0, 15);

  const totalPoints = predictions.reduce((s, p) => s + (p.points ?? 0), 0);
  const withPoints = predictions.filter((p) => (p.points ?? 0) > 0).length;
  const exact = predictions.filter((p) => p.exact).length;
  const accuracy =
    predictions.length > 0
      ? Math.round((withPoints / predictions.length) * 100)
      : 0;

  const memberSince = new Date(profile.createdAt).getFullYear();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <BackButton />

      {/* Header del perfil */}
      <section className="border-border bg-card overflow-hidden rounded-2xl border">
        {/* Portada */}
        <div className="relative h-40 w-full">
          <Image
            src={profile.coverImage ?? "/front-page-default.webp"}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
            unoptimized={profile.coverImage?.startsWith("data:") ?? false}
          />
        </div>
        {/* Avatar + info */}
        <div className="px-5 pb-5">
          <div className="-mt-8 mb-3">
            <Avatar size="lg" className="size-16 ring-4 ring-card">
              <AvatarImage src={isRealAvatar(profile.avatar) ? profile.avatar! : "/avatar-default.webp"} />
            </Avatar>
          </div>
          <h1 className="truncate text-xl font-bold">{profile.name}</h1>
          {profile.favoriteTeam && (
            <p className="text-muted-foreground text-sm">
              ⭐ {profile.favoriteTeam}
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Miembro desde {memberSince}
          </p>
        </div>
      </section>

      {/* Stats */}
      {predictions.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard icon={Target} label="Puntos" value={totalPoints} />
          <StatCard icon={BarChart2} label="Prec." value={`${accuracy}%`} />
          <StatCard icon={Zap} label="Exactos" value={exact} />
          <StatCard icon={Star} label="Pred." value={predictions.length} />
        </div>
      )}

      {/* Predicciones */}
      <section className="space-y-3">
        <h2 className="font-bold">
          Predicciones{" "}
          <span className="text-muted-foreground font-normal text-sm">
            ({predictions.length} partidos terminados)
          </span>
        </h2>

        {predictions.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
            Sin predicciones en partidos terminados todavía.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {visible.map((p) => (
                <PredictionRow key={p.matchId} p={p} />
              ))}
            </div>

            {predictions.length > 15 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-primary hover:text-primary/80 w-full text-center text-sm transition-colors"
              >
                {showAll
                  ? "Ver menos"
                  : `Ver ${predictions.length - 15} más`}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function PredictionRow({ p }: { p: PublicPrediction }) {
  const [open, setOpen] = useState(false);
  const pts = p.points ?? 0;
  const correct = pts > 0;
  const bd = p.breakdown;
  const hasBreakdown = bd !== null && pts > 0;

  return (
    <div
      className={cn(
        "bg-card overflow-hidden rounded-xl border",
        p.exact ? "border-primary/30 bg-primary/5" : "border-border",
      )}
    >
      {/* Fila principal */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Equipos */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {p.homeFlag} {p.homeTeam} vs {p.awayFlag} {p.awayTeam}
          </p>
          <p className="text-muted-foreground text-xs">
            {DATE_FMT.format(new Date(p.kickoffAt))}
          </p>
        </div>

        {/* Predicción vs resultado */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className={cn("font-bold tabular-nums", correct ? "text-foreground" : "text-muted-foreground")}>
            {p.homeScore}-{p.awayScore}
          </span>
          <span className="text-muted-foreground">vs</span>
          <span className="tabular-nums text-muted-foreground">
            {p.actualHome}-{p.actualAway}
          </span>
        </div>

        {/* Puntos + toggle */}
        <button
          type="button"
          onClick={() => hasBreakdown && setOpen((v) => !v)}
          disabled={!hasBreakdown}
          className={cn(
            "flex items-center gap-0.5 font-mono text-sm font-bold transition-colors",
            pts > 0 ? "text-primary" : "text-muted-foreground",
          )}
          aria-expanded={open}
        >
          {pts > 0 ? `+${pts}` : "0"}
          {hasBreakdown && (
            <ChevronDown
              className={cn("size-3.5 transition-transform", open && "rotate-180")}
            />
          )}
        </button>
      </div>

      {/* Desglose — desplegable */}
      {open && bd && (
        <div className="border-border/60 border-t px-4 py-3 space-y-2">
          <p className="text-muted-foreground font-mono text-3xs tracking-wide uppercase mb-2">
            Desglose de puntos
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <BreakdownItem
              label="Resultado 1X2"
              earned={bd.hit1x2}
              pts={1}
            />
            <BreakdownItem
              label="Diferencia de goles"
              earned={bd.hitDiff}
              pts={2}
            />
            <BreakdownItem
              label="Marcador exacto"
              earned={bd.exact}
              pts={2}
            />
            {bd.hitAdvance !== undefined && (
              <BreakdownItem
                label="Quién pasa"
                earned={bd.hitAdvance}
                pts={3}
              />
            )}
          </div>
          {bd.multiplier > 1 && (
            <div className="border-border/60 mt-2 flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground text-xs">
                Base {bd.base} × {bd.multiplier} (fase)
              </span>
              <span className="text-primary font-mono text-sm font-bold">
                = {bd.total} pts
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BreakdownItem({
  label,
  earned,
  pts,
}: {
  label: string;
  earned: boolean;
  pts: number;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 text-xs", !earned && "opacity-40")}>
      <span className={cn("font-medium", earned ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
      <span className={cn("font-mono font-bold shrink-0", earned ? "text-success" : "text-muted-foreground")}>
        {earned ? `+${pts}` : `+0`}
      </span>
    </div>
  );
}
