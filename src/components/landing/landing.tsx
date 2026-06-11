import Link from "next/link";
import { Radio, Globe, Users, ArrowRight } from "lucide-react";

import { PitchLines } from "@/components/ui/pitch-lines";

// Landing de marketing para usuarios NO logueados. Vive dentro del shell
// (topbar + bottom-nav persistentes), así que no lleva header propio.
export function Landing() {
  return (
    <div>
      {/* Hero: panel "estadio de noche" con líneas de campo */}
      <section className="pb-6 sm:pt-4">
        <div className="bg-aurora inset-hairline relative overflow-hidden rounded-3xl px-4 py-14 text-center text-white sm:py-20">
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
      <section className="py-8 sm:py-12">
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
    <div className="card-glass card-glass-hover rounded-2xl p-6">
      <div className="bg-primary-gradient shadow-primary/30 mb-4 inline-flex rounded-xl p-3 text-white shadow-md">
        {icon}
      </div>
      <h3 className="text-foreground mb-2 font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  );
}
