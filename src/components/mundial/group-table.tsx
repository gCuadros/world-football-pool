import type { GroupStanding } from "@/lib/providers/api-football";
import { cn } from "@/lib/utils";
import { TeamCrest } from "@/components/matches/team-crest";
import { TeamLink } from "@/components/matches/team-link";

/**
 * Clasificación compacta de un grupo: pos, equipo (enlazado), PJ, DG y PTS
 * (G/E/P y goles en ≥sm). Los dos primeros llevan el punto verde de zona de
 * clasificación; `highlightTeam` resalta la fila del equipo actual.
 */
export function GroupTable({
  group,
  highlightTeam,
}: {
  group: GroupStanding;
  highlightTeam?: string;
}) {
  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground border-border bg-muted/30 border-b font-mono text-3xs tracking-wide uppercase">
            <th className="w-8 px-2 py-2 text-center sm:px-3">#</th>
            <th className="px-2 py-2 text-left">Equipo</th>
            <th className="px-1.5 py-2 text-center">PJ</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell">G</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell">E</th>
            <th className="hidden px-1.5 py-2 text-center sm:table-cell">P</th>
            <th className="px-1.5 py-2 text-center">DG</th>
            <th className="px-2 py-2 text-center font-bold sm:px-3">PTS</th>
          </tr>
        </thead>
        <tbody>
          {group.teams.map((t) => {
            const mine = t.nameEs === highlightTeam;
            return (
              <tr
                key={t.nameEs}
                className={cn(
                  "border-border border-b last:border-0",
                  mine ? "bg-primary/5" : "hover:bg-muted/20",
                )}
              >
                <td className="px-2 py-2.5 text-center sm:px-3">
                  <span className="relative inline-flex items-center justify-center">
                    {/* Punto verde: zona de clasificación (top 2) */}
                    {t.rank <= 2 && (
                      <span className="bg-success absolute -left-2 size-1.5 rounded-full" />
                    )}
                    <span
                      className={cn(
                        "font-mono text-xs font-bold",
                        mine ? "text-primary" : "text-muted-foreground",
                      )}
                    >
                      {t.rank}
                    </span>
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <TeamLink name={t.nameEs} className="flex min-w-0 items-center gap-2">
                    <TeamCrest crest={t.logo} flag={t.flag} name={t.nameEs} size={18} className="shrink-0" />
                    <span
                      className={cn(
                        "truncate",
                        mine ? "font-bold" : "font-medium",
                      )}
                    >
                      {t.nameEs}
                    </span>
                  </TeamLink>
                </td>
                <td className="px-1.5 py-2.5 text-center font-mono text-xs">{t.played}</td>
                <td className="hidden px-1.5 py-2.5 text-center font-mono text-xs sm:table-cell">{t.won}</td>
                <td className="hidden px-1.5 py-2.5 text-center font-mono text-xs sm:table-cell">{t.drawn}</td>
                <td className="hidden px-1.5 py-2.5 text-center font-mono text-xs sm:table-cell">{t.lost}</td>
                <td
                  className={cn(
                    "px-1.5 py-2.5 text-center font-mono text-xs",
                    t.goalDiff > 0 && "text-success",
                    t.goalDiff < 0 && "text-live",
                  )}
                >
                  {t.goalDiff > 0 ? `+${t.goalDiff}` : t.goalDiff}
                </td>
                <td
                  className={cn(
                    "px-2 py-2.5 text-center font-mono font-bold sm:px-3",
                    mine && "text-primary",
                  )}
                >
                  {t.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-muted-foreground border-border bg-muted/20 border-t px-3 py-2 font-mono text-3xs">
        <span className="bg-success mr-1.5 inline-block size-1.5 rounded-full" />
        Los dos primeros se clasifican directamente
      </p>
    </div>
  );
}
