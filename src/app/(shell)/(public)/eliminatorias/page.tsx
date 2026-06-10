import { Reveal } from "@/components/ui/reveal";
import Link from "next/link";
import { TreeStructure } from "@phosphor-icons/react/dist/ssr";

import { getKnockoutMatches, type KnockoutRound, type MatchBase } from "@/lib/queries";
import { TeamCrest } from "@/components/matches/team-crest";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const metadata = { title: "Eliminatorias · Quiniela Mundial 2026" };

export default function EliminatoriasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TreeStructure className="text-primary size-5" />
        <h1 className="text-xl font-bold">Cuadro de Eliminatorias</h1>
      </div>

      <Reveal fallback={<BracketSkeleton />}>
        <BracketContent />
      </Reveal>
    </div>
  );
}

async function BracketContent() {
  const rounds = await getKnockoutMatches();

  if (rounds.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
        El cuadro se publicará cuando termine la fase de grupos.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-6">
        {rounds.map((round) => (
          <RoundColumn key={round.stage} round={round} />
        ))}
      </div>
    </div>
  );
}

function RoundColumn({ round }: { round: KnockoutRound }) {
  const multiplierStr = round.multiplier % 1 === 0
    ? `×${round.multiplier}`
    : `×${round.multiplier.toFixed(2).replace(".", ",")}`;

  return (
    <div className="flex w-56 shrink-0 flex-col gap-3">
      <div className="border-border border-b pb-2">
        <p className="font-mono text-2xs font-bold tracking-widest text-foreground uppercase">
          {round.label}
        </p>
        <p className="text-muted-foreground font-mono text-3xs">{multiplierStr}</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {round.matches.map((m) => (
          <KoMatchCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

function getWinner(match: MatchBase): "HOME" | "AWAY" | null {
  if (match.advanced) return match.advanced;
  if (match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null) {
    if (match.homeScore > match.awayScore) return "HOME";
    if (match.awayScore > match.homeScore) return "AWAY";
  }
  return null;
}

function KoMatchCard({ match }: { match: MatchBase }) {
  const winner = getWinner(match);
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";

  return (
    <Link
      href={`/partido/${match.id}`}
      className="card-glass hover:border-primary/40 group rounded-xl p-3 transition-all hover:-translate-y-0.5"
    >
      <TeamRow
        name={match.homeTeam}
        flag={match.homeFlag}
        crest={match.homeCrest}
        score={match.homeScore}
        isWinner={winner === "HOME"}
        isLoser={winner === "AWAY"}
      />
      <div className="my-1.5 flex items-center gap-2">
        <div className="bg-border h-px flex-1" />
        <StatusBadge status={match.status} liveMinute={match.liveMinute} />
        <div className="bg-border h-px flex-1" />
      </div>
      <TeamRow
        name={match.awayTeam}
        flag={match.awayFlag}
        crest={match.awayCrest}
        score={match.awayScore}
        isWinner={winner === "AWAY"}
        isLoser={winner === "HOME"}
      />
      {!isFinished && !isLive && (
        <p className="text-muted-foreground mt-2 font-mono text-3xs tabular-nums">
          {new Date(match.kickoffAt).toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </Link>
  );
}

function TeamRow({
  name,
  flag,
  crest,
  score,
  isWinner,
  isLoser,
}: {
  name: string;
  flag: string | null;
  crest: string | null;
  score: number | null;
  isWinner: boolean;
  isLoser: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", isLoser && "opacity-40")}>
      <TeamCrest crest={crest} flag={flag} name={name} size={20} className="shrink-0" />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          isWinner ? "font-bold text-foreground" : "font-medium text-foreground/80",
        )}
      >
        {name}
      </span>
      {score !== null && (
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            isWinner ? "font-bold text-foreground" : "text-muted-foreground",
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  liveMinute,
}: {
  status: string;
  liveMinute: number | null;
}) {
  if (status === "LIVE") {
    return (
      <span className="bg-live/10 text-live rounded-full px-1.5 py-0.5 font-mono text-3xs font-bold tracking-wide uppercase">
        {liveMinute ? `${liveMinute}'` : "En vivo"}
      </span>
    );
  }
  if (status === "FINISHED") {
    return (
      <span className="text-muted-foreground font-mono text-3xs uppercase tracking-wide">
        Final
      </span>
    );
  }
  return (
    <span className="text-muted-foreground font-mono text-3xs uppercase tracking-wide">vs</span>
  );
}

function BracketSkeleton() {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-6">
        {[16, 8, 4, 2, 1, 1].map((count, i) => (
          <div key={i} className="flex w-56 shrink-0 flex-col gap-3">
            <Skeleton className="h-8 w-32" />
            <div className="flex flex-col gap-2.5">
              {Array.from({ length: Math.min(count, 4) }).map((_, j) => (
                <Skeleton key={j} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
