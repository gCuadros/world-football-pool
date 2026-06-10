import type { MatchBase } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { ClickCard } from "@/components/ui/click-card";
import { PitchLines } from "@/components/ui/pitch-lines";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeroMatch({ match, now }: { match: MatchBase; now?: Date }) {
  const live = match.status === "LIVE";
  const finished = match.status === "FINISHED";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const homeWins = hasScore && match.homeScore! > match.awayScore!;
  const awayWins = hasScore && match.awayScore! > match.homeScore!;
  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage];

  return (
    <ClickCard
      href={`/partido/${match.id}`}
      ariaLabel={`${match.homeTeam} contra ${match.awayTeam}`}
      className={cn(
        "inset-hairline relative block overflow-hidden rounded-3xl p-5 text-white transition-transform hover:-translate-y-0.5 sm:p-6",
        live ? "bg-live-hero" : "bg-aurora",
      )}
    >
      <PitchLines />
      <div className="relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-3xs tracking-widest text-white/70 uppercase">
            {stageTag}
          </span>
          {live ? (
            <span className="text-live flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider">
              <span className="relative flex size-2">
                <span className="bg-live absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                <span className="bg-live relative inline-flex size-2 rounded-full" />
              </span>
              {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
            </span>
          ) : finished ? (
            <span className="font-mono text-2xs text-white/50 uppercase tracking-widest">Final</span>
          ) : (
            <span className="font-mono text-2xs text-white/70">
              {formatRelativeDay(match.kickoffAt, now)} · {formatTime(match.kickoffAt)}
            </span>
          )}
        </div>

        {/* Score area */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <HeroTeam flag={match.homeFlag} crest={match.homeCrest} name={match.homeTeam} winner={homeWins} />
          <div className="flex flex-col items-center gap-1.5 pb-6">
            {hasScore ? (
              <>
                <div className="flex items-baseline gap-1 font-mono text-5xl font-black tracking-tight tabular-nums">
                  <span className={homeWins ? "text-white" : awayWins ? "text-white/40" : "text-white"}>
                    {match.homeScore}
                  </span>
                  <span className="text-2xl font-bold text-white/30 mx-0.5">–</span>
                  <span className={awayWins ? "text-white" : homeWins ? "text-white/40" : "text-white"}>
                    {match.awayScore}
                  </span>
                </div>
                {finished && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-3xs text-white/60 uppercase tracking-wide">
                    FT
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="font-mono text-3xl font-black tabular-nums">
                  {formatTime(match.kickoffAt)}
                </span>
                <span className="font-mono text-3xs tracking-[0.3em] text-white/40 uppercase">vs</span>
              </>
            )}
          </div>
          <HeroTeam flag={match.awayFlag} crest={match.awayCrest} name={match.awayTeam} winner={awayWins} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-3xs text-white/50">
            {match.stadium}{match.city ? ` · ${match.city}` : ""}
          </span>
          <span className={`flex shrink-0 items-center gap-0.5 text-xs font-semibold ${live ? "text-live" : "text-white/80"}`}>
            {live ? "Ver en directo" : "Ver partido"}
            <ChevronRight className="size-3.5" />
          </span>
        </div>
      </div>
    </ClickCard>
  );
}

function HeroTeam({
  flag,
  crest,
  name,
  winner,
}: {
  flag: string | null;
  crest: string | null;
  name: string;
  winner?: boolean;
}) {
  return (
    <TeamLink name={name} className="flex min-w-0 flex-col items-center gap-2.5">
      <span className={`flex size-18 items-center justify-center rounded-3xl ring-1 transition-all ${winner ? "bg-white/18 ring-white/30 shadow-lg shadow-white/10" : "bg-white/10 ring-white/12"}`}>
        <TeamCrest crest={crest} flag={flag} name={name} size={44} />
      </span>
      <span className={`max-w-full truncate text-center text-sm ${winner ? "font-extrabold text-white" : "font-medium text-white/70"}`}>
        {name}
      </span>
    </TeamLink>
  );
}
