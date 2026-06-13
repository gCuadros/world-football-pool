import Link from "next/link";

import { formatLiveMinute, formatTime, formatRelativeDay } from "@/lib/format";
import { TeamCrest } from "@/components/matches/team-crest";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { KnockoutRound, MatchBase } from "@/lib/queries";

/** Cuadro de eliminatorias: una columna por ronda, con scroll horizontal. */
export function KnockoutBracket({ rounds }: { rounds: KnockoutRound[] }) {
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
  const multiplierStr =
    round.multiplier % 1 === 0
      ? `×${round.multiplier}`
      : `×${round.multiplier.toFixed(2).replace(".", ",")}`;

  return (
    <div className="flex w-56 shrink-0 flex-col gap-3">
      <div className="border-border border-b pb-2">
        <p className="text-foreground font-mono text-2xs font-bold tracking-widest uppercase">
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
      className="card-glass card-glass-hover group rounded-xl p-3"
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
          {formatRelativeDay(match.kickoffAt)} · {formatTime(match.kickoffAt)}
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
          isWinner ? "text-foreground font-bold" : "text-foreground/80 font-medium",
        )}
      >
        {name}
      </span>
      {score !== null && (
        <span
          className={cn(
            "font-mono text-sm tabular-nums",
            isWinner ? "text-foreground font-bold" : "text-muted-foreground",
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
        {formatLiveMinute(liveMinute)}
      </span>
    );
  }
  if (status === "FINISHED") {
    return (
      <span className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">
        Final
      </span>
    );
  }
  return (
    <span className="text-muted-foreground font-mono text-3xs tracking-wide uppercase">vs</span>
  );
}

export function BracketSkeleton() {
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
