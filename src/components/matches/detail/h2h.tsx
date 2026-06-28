import { getMatchPrediction, getMatchH2H } from "@/lib/queries";
import { TeamCrest } from "@/components/matches/team-crest";
import type { H2HMatch } from "@/lib/providers/api-football";

const DATE_FMT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export async function H2HSection({
  externalId,
  homeTeam,
  awayTeam,
}: {
  externalId: string | null;
  homeTeam: string;
  awayTeam: string;
}) {
  if (!externalId) return null;
  const prediction = await getMatchPrediction(externalId);
  if (!prediction?.homeId || !prediction?.awayId) return null;

  const matches = await getMatchH2H(prediction.homeId, prediction.awayId);
  if (matches.length === 0) return null;

  // Count from the current match's home team perspective
  let homeWins = 0, draws = 0, awayWins = 0;
  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue;
    const homeIsHome = m.home === homeTeam;
    const homeIsAway = m.away === homeTeam;
    const homeScore = homeIsHome ? m.homeScore : homeIsAway ? m.awayScore : null;
    const awayScore = homeIsHome ? m.awayScore : homeIsAway ? m.homeScore : null;
    if (homeScore == null || awayScore == null) continue;
    if (homeScore > awayScore) homeWins++;
    else if (homeScore === awayScore) draws++;
    else awayWins++;
  }

  return (
    <section className="card-glass rounded-2xl p-5 space-y-4">
      <h2 className="font-mono text-base font-bold">Historial de enfrentamientos</h2>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center font-mono text-sm">
        <div>
          <div className="text-primary text-2xl font-bold">{homeWins}</div>
          <div className="text-muted-foreground text-2xs truncate">{homeTeam}</div>
        </div>
        <div>
          <div className="text-foreground text-2xl font-bold">{draws}</div>
          <div className="text-muted-foreground text-2xs">Empates</div>
        </div>
        <div>
          <div className="text-chart-2 text-2xl font-bold">{awayWins}</div>
          <div className="text-muted-foreground text-2xs truncate">{awayTeam}</div>
        </div>
      </div>
      <div className="space-y-2">
        {matches.map((m, i) => (
          <div key={i} className="grid grid-cols-[5rem_1fr_auto_1fr] items-center gap-2 text-sm">
            <span className="text-muted-foreground font-mono text-2xs leading-tight">
              {DATE_FMT.format(new Date(m.date))}
            </span>
            <span className="flex items-center justify-end gap-1.5 min-w-0">
              <span className="truncate text-right">{m.home}</span>
              <TeamCrest crest={null} flag={m.homeFlag} name={m.home} size={16} className="shrink-0" />
            </span>
            <span className="font-mono font-bold tabular-nums shrink-0 text-center px-1">
              {m.homeScore ?? "–"} – {m.awayScore ?? "–"}
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <TeamCrest crest={null} flag={m.awayFlag} name={m.away} size={16} className="shrink-0" />
              <span className="truncate">{m.away}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
