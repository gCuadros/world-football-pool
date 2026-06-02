import Link from "next/link";
import { Trophy, Radio, Globe, Users, ArrowRight, LogIn } from "lucide-react";

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

      {/* Hero */}
      <section className="from-primary/5 to-background relative overflow-hidden bg-gradient-to-b px-4 py-16 text-center sm:py-20">
        <div className="relative mx-auto max-w-3xl">
          <span className="bg-primary/10 text-primary mb-4 inline-block rounded-full px-3 py-1 font-mono text-xs font-semibold tracking-widest uppercase">
            FIFA World Cup 2026
          </span>
          <h1 className="text-foreground mb-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Tu quiniela del
            <br />
            <span className="text-primary">Mundial 2026</span>
          </h1>
          <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-base sm:text-lg">
            Sigue los resultados en vivo, compite con amigos en tu liga privada
            y descubre quién predice mejor el Mundial.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors sm:w-auto"
            >
              <Users className="size-4" />
              Crear o unirse a una liga
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/resultados"
              className="text-foreground border-border hover:bg-muted flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3 font-semibold transition-colors sm:w-auto"
            >
              <Radio className="size-4" />
              Ver resultados
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Radio className="text-primary size-6" />}
            title="Resultados en vivo"
            description="Sigue cada partido del Mundial en tiempo real con marcadores, goles y tarjetas actualizados."
          />
          <FeatureCard
            icon={<Users className="text-primary size-6" />}
            title="Ligas privadas"
            description="Crea tu liga con amigos o compañeros. Cada liga tiene su propia clasificación y predicciones."
          />
          <FeatureCard
            icon={<Globe className="text-primary size-6" />}
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
    <div className="border-border rounded-2xl border bg-card p-6">
      <div className="bg-primary/10 mb-4 inline-flex rounded-xl p-3">{icon}</div>
      <h3 className="text-foreground mb-2 font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
