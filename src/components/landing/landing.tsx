import Link from "next/link";
import { Trophy, Radio, Globe, Users, ArrowRight, LogIn } from "lucide-react";

import { PitchLines } from "@/components/ui/pitch-lines";

// Landing de marketing para usuarios NO logueados (full-bleed, sin shell).
export function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-border/50 sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6">
          <span className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight">
            <Trophy className="text-primary size-4" />
            QUINIELA <span className="text-muted-foreground hidden font-normal sm:inline">· 2026</span>
          </span>
          <nav className="flex items-center gap-0.5 sm:gap-1">
            <Link
              href="/resultados"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors sm:px-3"
            >
              <Radio className="size-3.5" />
              Resultados
            </Link>
            <Link
              href="/mundial"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-colors sm:px-3"
            >
              <Globe className="size-3.5" />
              Mundial
            </Link>
          </nav>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1.5 text-sm transition-colors"
          >
            <LogIn className="size-4" />
            Entrar
          </Link>
        </div>
      </header>

      {/* Hero: panel "estadio de noche" con líneas de campo */}
      <section className="px-4 pt-4 pb-6 sm:pt-8">
        <div className="bg-aurora inset-hairline relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-4 py-14 text-center text-white sm:py-20">
          <PitchLines />
          <div className="relative mx-auto max-w-3xl">
            <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-semibold tracking-widest text-white/85 uppercase ring-1 ring-white/15">
              FIFA World Cup 2026
            </span>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-6xl">
              Tu quiniela del
              <br />
              <span className="text-gradient-hero">Mundial 2026</span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base text-white/70 sm:text-lg">
              Sigue los resultados en vivo, compite con amigos en tu liga privada
              y descubre quién predice mejor el Mundial.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/login"
                className="bg-primary-gradient glow-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
              >
                <Users className="size-4" />
                Crear o unirse a una liga
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/resultados"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15 sm:w-auto"
              >
                <Radio className="size-4" />
                Ver resultados
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Radio className="size-6" />}
            title="Resultados en vivo"
            description="Sigue cada partido del Mundial en tiempo real con marcadores, goles y tarjetas actualizados."
          />
          <FeatureCard
            icon={<Users className="size-6" />}
            title="Ligas privadas"
            description="Crea tu liga con amigos o compañeros. Cada liga tiene su propia clasificación y predicciones."
          />
          <FeatureCard
            icon={<Globe className="size-6" />}
            title="Info del Mundial"
            description="Grupos, standings, goleadores y todo lo que necesitas saber sobre la Copa del Mundo 2026."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="border-border hover:border-primary/30 hover:glow-primary rounded-2xl border bg-card p-6 transition motion-safe:hover:-translate-y-0.5">
      <div className="bg-primary-gradient shadow-primary/30 mb-4 inline-flex rounded-xl p-3 text-white shadow-md">
        {icon}
      </div>
      <h3 className="text-foreground mb-2 font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
