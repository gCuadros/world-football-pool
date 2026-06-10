import type { MatchBase } from "@/lib/queries";
import { STAGE_SHORT } from "@/lib/labels";
import { formatRelativeDay, formatTime } from "@/lib/format";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";
import { ClickCard } from "@/components/ui/click-card";
import { PitchLines } from "@/components/ui/pitch-lines";
import { ArrowRight } from "lucide-react";

/**
 * Hero del dashboard: el partido en directo (o el siguiente) sobre el panel
 * "estadio de noche" con líneas de campo, escudos grandes y marcador u hora.
 * La tarjeta navega al partido; cada equipo enlaza a su página.
 */
export function HeroMatch({ match, now }: { match: MatchBase; now?: Date }) {
  const live = match.status === "LIVE";
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const stageTag =
    match.stage === "GROUP_STAGE" && match.group
      ? `Grupo ${match.group}`
      : STAGE_SHORT[match.stage];

  return (
    <ClickCard
      href={`/partido/${match.id}`}
      ariaLabel={`${match.homeTeam} contra ${match.awayTeam}`}
      className="bg-aurora inset-hairline glow-primary relative block overflow-hidden rounded-3xl p-5 text-white sm:p-6"
    >
      <PitchLines />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-3xs tracking-widest text-white/80 uppercase">
            {stageTag}
          </span>
          {live ? (
            <span className="flex items-center gap-1.5 font-mono text-xs font-bold tracking-wider text-rose-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-rose-400" />
              </span>
              {match.liveMinute ? `${match.liveMinute}'` : "EN VIVO"}
            </span>
          ) : (
            <span className="font-mono text-2xs text-white/70">
              {formatRelativeDay(match.kickoffAt, now)} · {formatTime(match.kickoffAt)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <HeroTeam flag={match.homeFlag} crest={match.homeCrest} name={match.homeTeam} />
          <div className="flex flex-col items-center gap-1 pb-6">
            {hasScore ? (
              <span className="font-mono text-5xl font-black tracking-tight tabular-nums">
                {match.homeScore}
                <span className="mx-1.5 text-3xl font-bold text-white/40">–</span>
                {match.awayScore}
              </span>
            ) : (
              <>
                <span className="font-mono text-3xl font-black tabular-nums">
                  {formatTime(match.kickoffAt)}
                </span>
                <span className="font-mono text-3xs tracking-[0.3em] text-white/50 uppercase">
                  vs
                </span>
              </>
            )}
          </div>
          <HeroTeam flag={match.awayFlag} crest={match.awayCrest} name={match.awayTeam} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-3xs text-white/60">
            {match.stadium}
            {match.city ? ` · ${match.city}` : ""}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90">
            {live ? "Ver en directo" : "Ver partido"}
            <ArrowRight className="size-3.5" />
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
}: {
  flag: string | null;
  crest: string | null;
  name: string;
}) {
  // Escudo + nombre enlazan al equipo; el CTA "Ver partido" del pie y la
  // tarjeta entera abren el partido.
  return (
    <TeamLink name={name} className="flex min-w-0 flex-col items-center gap-2">
      <span className="flex size-16 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/15">
        <TeamCrest crest={crest} flag={flag} name={name} size={38} />
      </span>
      <span className="max-w-full truncate text-center text-sm font-semibold">
        {name}
      </span>
    </TeamLink>
  );
}
