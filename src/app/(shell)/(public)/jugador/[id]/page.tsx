import Image from "next/image";
import { notFound } from "next/navigation";

import { BackButton } from "@/components/ui/back-button";
import { Reveal } from "@/components/ui/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamCrest } from "@/components/matches/team-crest";
import { getPlayer } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const player = await getPlayer(Number(id));
  return { title: player ? player.name : "Jugador" };
}

export default function JugadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Reveal fallback={<PageSkeleton />}>
      <JugadorContent params={params} />
    </Reveal>
  );
}

async function JugadorContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isFinite(playerId)) notFound();

  const player = await getPlayer(playerId);
  if (!player) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BackButton />

      {/* Ficha */}
      <div className="card-glass rounded-2xl p-6">
        <div className="flex items-center gap-4">
          {player.photo ? (
            <Image
              src={player.photo}
              alt={player.name}
              width={80}
              height={80}
              unoptimized
              className="size-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="bg-muted flex size-20 shrink-0 items-center justify-center rounded-full text-2xl">
              👤
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{player.name}</h1>
            <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
              <TeamCrest
                crest={player.teamLogo}
                flag={player.teamFlag}
                name={player.teamName}
                size={16}
                className="shrink-0"
              />
              <span className="truncate">{player.teamName}</span>
              {player.position && <span>· {player.position}</span>}
            </div>
            {player.age != null && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {player.age} años
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats del torneo */}
      <section className="card-glass rounded-2xl p-5">
        <h2 className="mb-4 flex items-center gap-2 font-mono text-base font-bold">
          <span>📊</span> En el Mundial
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          <Stat label="Goles" value={player.goals} highlight />
          <Stat label="Asistencias" value={player.assists} highlight />
          <Stat label="Partidos" value={player.appearances} />
          <Stat label="Minutos" value={player.minutes} />
          <Stat label="Amarillas" value={player.yellow} />
          <Stat label="Rojas" value={player.red} />
          {player.rating != null && (
            <Stat label="Valoración" value={player.rating.toFixed(1)} />
          )}
        </div>
        <p className="text-muted-foreground mt-4 text-2xs">
          Datos vía API-Football
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-muted/40 flex flex-col items-center rounded-xl py-3">
      <span
        className={`font-mono text-xl font-bold tabular-nums ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </span>
      <span className="text-muted-foreground mt-0.5 text-2xs">{label}</span>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
