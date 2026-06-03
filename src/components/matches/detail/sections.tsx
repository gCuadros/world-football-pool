import {
  getMatchLineups,
  getMatchStatistics,
  getMatchEvents,
  getCommunityDistribution,
} from "@/lib/queries";
import { TeamCrest } from "@/components/matches/team-crest";

// Tarjeta contenedora de sección con título.
function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card rounded-2xl border p-5">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-[15px] font-bold">
        {icon && <span>{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ── Alineaciones ──────────────────────────────────────────────────────────
export async function LineupsSection({ externalId }: { externalId: string | null }) {
  if (!externalId) return null;
  const lineups = await getMatchLineups(externalId);
  if (lineups.length === 0) return null;

  return (
    <SectionCard title="Alineaciones" icon="👕">
      <div className="grid gap-6 sm:grid-cols-2">
        {lineups.map((l) => (
          <div key={l.team} className="space-y-3">
            <div className="flex items-center gap-2">
              <TeamCrest crest={l.teamLogo} flag={l.teamFlag} name={l.team} size={20} />
              <span className="truncate font-semibold">{l.team}</span>
              {l.formation && (
                <span className="text-muted-foreground ml-auto font-mono text-xs">
                  {l.formation}
                </span>
              )}
            </div>
            <div className="space-y-1">
              {l.startXI.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-6 shrink-0 text-right font-mono text-xs">
                    {p.number ?? ""}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{p.name}</span>
                  {p.pos && (
                    <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                      {p.pos}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {l.substitutes.length > 0 && (
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">Suplentes:</span>{" "}
                {l.substitutes.map((s) => s.name).join(", ")}
              </p>
            )}
            {l.coach && (
              <p className="text-muted-foreground text-xs">
                <span className="font-medium">Entrenador:</span> {l.coach}
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Cronología (eventos) ──────────────────────────────────────────────────
function eventIcon(type: string, detail: string): string {
  const t = type.toLowerCase();
  if (t === "goal") return detail.toLowerCase().includes("own") ? "🥅" : "⚽";
  if (t === "card") return detail.toLowerCase().includes("red") ? "🟥" : "🟨";
  if (t === "subst") return "🔁";
  return "•";
}

export async function TimelineSection({ externalId }: { externalId: string | null }) {
  if (!externalId) return null;
  const events = await getMatchEvents(externalId);
  if (events.length === 0) return null;

  return (
    <SectionCard title="Cronología" icon="⏱️">
      <div className="space-y-2">
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground w-8 shrink-0 font-mono text-xs">
              {e.minute != null ? `${e.minute}'` : "—"}
            </span>
            <span>{eventIcon(e.type, e.detail)}</span>
            <span className="min-w-0 flex-1 truncate">{e.player ?? e.detail}</span>
            <span className="text-muted-foreground shrink-0 truncate text-xs">
              {e.team}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Estadísticas ──────────────────────────────────────────────────────────
function statNum(v: string | number | null): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  return Number(String(v).replace("%", "").trim()) || 0;
}

export async function StatsSection({ externalId }: { externalId: string | null }) {
  if (!externalId) return null;
  const stats = await getMatchStatistics(externalId);
  if (stats.length < 2) return null;

  const [home, away] = stats;
  const awayMap = new Map(away.stats.map((s) => [s.label, s.value]));

  return (
    <SectionCard title="Estadísticas" icon="📊">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1.5">
          <TeamCrest crest={null} flag={home.teamFlag} name={home.team} size={16} />
          {home.team}
        </span>
        <span className="flex items-center gap-1.5">
          {away.team}
          <TeamCrest crest={null} flag={away.teamFlag} name={away.team} size={16} />
        </span>
      </div>
      <div className="space-y-2.5">
        {home.stats.map((s) => {
          const av = awayMap.get(s.label);
          const hn = statNum(s.value);
          const an = statNum(av ?? null);
          const total = hn + an || 1;
          return (
            <div key={s.label} className="space-y-1">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold">{s.value ?? "—"}</span>
                <span className="text-muted-foreground">{s.label}</span>
                <span className="font-bold">{av ?? "—"}</span>
              </div>
              <div className="flex h-1.5 gap-0.5">
                <div className="bg-muted flex flex-1 justify-end overflow-hidden rounded-l-full">
                  <div className="bg-primary h-full rounded-l-full" style={{ width: `${(hn / total) * 100}%` }} />
                </div>
                <div className="bg-muted flex flex-1 overflow-hidden rounded-r-full">
                  <div className="bg-chart-2 h-full rounded-r-full" style={{ width: `${(an / total) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ── Cómo predijo la comunidad (social, tras el inicio) ────────────────────
export async function CommunitySection({ matchId }: { matchId: string }) {
  const community = await getCommunityDistribution(matchId);
  if (!community || community.total === 0) return null;

  return (
    <SectionCard title="Cómo predijo la comunidad" icon="👥">
      <p className="text-muted-foreground mb-3 font-mono text-[11px] tracking-wide uppercase">
        {community.total} {community.total === 1 ? "predicción" : "predicciones"}
      </p>
      <div className="mb-3 flex items-center gap-4 font-mono text-sm">
        <span><span className="font-bold">{community.results.home}%</span> local</span>
        <span><span className="font-bold">{community.results.draw}%</span> empate</span>
        <span><span className="font-bold">{community.results.away}%</span> visitante</span>
      </div>
      {community.scores.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {community.scores.map((s) => (
            <span
              key={s.label}
              className="bg-muted rounded-md px-2 py-0.5 font-mono text-[11px]"
            >
              {s.label} · {s.pct}%
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
