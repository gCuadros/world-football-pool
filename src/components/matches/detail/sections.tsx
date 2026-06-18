import Link from "next/link";

import {
  getMatchLineups,
  getMatchStatistics,
  getMatchEvents,
  getCommunityDistribution,
  getMatchPrediction,
  getMatchOdds,
  getFifaCalendar,
  getMatchPhysical,
} from "@/lib/queries";
import { TeamCrest } from "@/components/matches/team-crest";
import { PitchLineup } from "@/components/matches/detail/pitch-lineup";

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
    <section className="card-glass rounded-2xl p-5">
      <h2 className="mb-4 flex items-center gap-2 font-mono text-base font-bold">
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
      <PitchLineup lineups={lineups} />
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
            {e.playerId && e.player ? (
              <Link href={`/jugador/${e.playerId}`} className="min-w-0 flex-1 truncate hover:underline">
                {e.player}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 truncate">{e.player ?? e.detail}</span>
            )}
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
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <TeamCrest crest={null} flag={home.teamFlag} name={home.team} size={16} className="shrink-0" />
          <span className="truncate">{home.team}</span>
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <span className="truncate text-right">{away.team}</span>
          <TeamCrest crest={null} flag={away.teamFlag} name={away.team} size={16} className="shrink-0" />
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
      <p className="text-muted-foreground mb-3 font-mono text-2xs tracking-wide uppercase">
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
              className="bg-muted rounded-md px-2 py-0.5 font-mono text-2xs"
            >
              {s.label} · {s.pct}%
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// Cabecera local/visitante con banderas, reutilizada por las barras 1X2.
function TeamsRow({
  homeTeam,
  awayTeam,
  homeFlag,
  awayFlag,
}: {
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
      <span className="flex min-w-0 items-center gap-1.5">
        <TeamCrest crest={null} flag={homeFlag} name={homeTeam} size={16} className="shrink-0" />
        <span className="truncate">{homeTeam}</span>
      </span>
      <span className="flex min-w-0 items-center justify-end gap-1.5">
        <span className="truncate text-right">{awayTeam}</span>
        <TeamCrest crest={null} flag={awayFlag} name={awayTeam} size={16} className="shrink-0" />
      </span>
    </div>
  );
}

// Barra 1X2 (local / empate / visitante) a partir de tres porcentajes.
function ProbBar({ home, draw, away }: { home: number; draw: number; away: number }) {
  const total = home + draw + away || 1;
  return (
    <>
      <div className="mb-1.5 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-l-full" style={{ width: `${(home / total) * 100}%` }} />
        <div className="bg-muted-foreground/40 h-full" style={{ width: `${(draw / total) * 100}%` }} />
        <div className="bg-chart-2 h-full rounded-r-full" style={{ width: `${(away / total) * 100}%` }} />
      </div>
      <div className="text-muted-foreground flex justify-between font-mono text-2xs">
        <span><span className="text-foreground font-bold">{home}%</span> local</span>
        <span><span className="text-foreground font-bold">{draw}%</span> empate</span>
        <span><span className="text-foreground font-bold">{away}%</span> visitante</span>
      </div>
    </>
  );
}

// ── Datos oficiales FIFA (asistencia, árbitro) ────────────────────────────
// Une el partido de la BD con el calendario oficial por matchNo === MatchNumber.
// Sólo partidos del Mundial (los amistosos, matchNo 9000+, no están en la FIFA).
export async function MatchOfficialInfo({ matchNo }: { matchNo: number }) {
  const cal = await getFifaCalendar();
  const info = cal[String(matchNo)];
  if (!info || (info.attendance == null && !info.referee)) return null;

  return (
    <SectionCard title="Datos del partido" icon="📋">
      <dl className="divide-border/60 divide-y">
        {info.attendance != null && (
          <div className="flex items-center justify-between py-2 text-sm first:pt-0">
            <dt className="text-muted-foreground">Asistencia</dt>
            <dd className="font-mono font-bold tabular-nums">
              {info.attendance.toLocaleString("es-ES")}
              <span className="text-muted-foreground ml-1 font-sans text-xs font-normal">
                espectadores
              </span>
            </dd>
          </div>
        )}
        {info.referee && (
          <div className="flex items-center justify-between gap-3 py-2 text-sm last:pb-0">
            <dt className="text-muted-foreground shrink-0">Árbitro</dt>
            <dd className="min-w-0 truncate text-right font-medium">
              {info.referee}
              {info.refereeCountry && (
                <span className="text-muted-foreground ml-1.5 font-mono text-2xs">
                  {info.refereeCountry}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
      <p className="text-muted-foreground mt-3 text-2xs">Datos oficiales FIFA</p>
    </SectionCard>
  );
}

// ── Rendimiento físico (FIFA EFI, instantánea) ────────────────────────────
function PhysLeader({
  label,
  icon,
  name,
  value,
}: {
  label: string;
  icon: string;
  name: string;
  value: string;
}) {
  return (
    <div className="bg-muted/40 flex flex-col items-center rounded-xl px-2 py-3 text-center">
      <span className="text-muted-foreground font-mono text-2xs">
        <span aria-hidden="true">{icon}</span> {label}
      </span>
      <span className="mt-1 font-mono text-base font-bold tabular-nums">{value}</span>
      <span className="text-muted-foreground mt-0.5 max-w-full truncate text-2xs">{name}</span>
    </div>
  );
}

export async function MatchPhysical({ matchNo }: { matchNo: number }) {
  const players = await getMatchPhysical(matchNo);
  if (players.length === 0) return null;

  const max = <K extends keyof (typeof players)[number]>(key: K) =>
    players
      .filter((p) => p[key] != null)
      .sort((a, b) => (b[key] as number) - (a[key] as number))[0];

  const topDist = max("dist");
  const topSpeed = max("topSpeed");
  const topSprints = max("sprints");

  // Distancia total por equipo (km).
  const byTeam = new Map<string, number>();
  for (const p of players) {
    if (!p.team) continue;
    byTeam.set(p.team, (byTeam.get(p.team) ?? 0) + p.dist);
  }
  const teams = [...byTeam.entries()];

  return (
    <SectionCard title="Rendimiento físico" icon="🏃">
      <div className="grid grid-cols-3 gap-2">
        {topDist && (
          <PhysLeader
            label="Más distancia"
            icon="🏃"
            name={topDist.name}
            value={`${(topDist.dist / 1000).toFixed(1)} km`}
          />
        )}
        {topSpeed?.topSpeed != null && (
          <PhysLeader
            label="Más rápido"
            icon="⚡"
            name={topSpeed.name}
            value={`${topSpeed.topSpeed.toFixed(1)}`}
          />
        )}
        {topSprints?.sprints != null && (
          <PhysLeader
            label="Más sprints"
            icon="💨"
            name={topSprints.name}
            value={`${topSprints.sprints}`}
          />
        )}
      </div>

      {teams.length === 2 && (
        <div className="mt-4 space-y-1.5">
          <p className="text-muted-foreground font-mono text-2xs tracking-wide uppercase">
            Distancia por equipo
          </p>
          {teams.map(([team, dist]) => {
            const total = teams[0][1] + teams[1][1] || 1;
            return (
              <div key={team} className="flex items-center gap-2 text-xs">
                <span className="w-9 shrink-0 font-mono font-bold">{team}</span>
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${(dist / total) * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-14 shrink-0 text-right font-mono tabular-nums">
                  {(dist / 1000).toFixed(1)} km
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-muted-foreground mt-3 text-2xs">
        Velocidad punta en km/h · datos físicos oficiales FIFA
      </p>
    </SectionCard>
  );
}

// ── Las apuestas (casas) ──────────────────────────────────────────────────
// Cuotas 1X2 de una casa + probabilidad implícita (1/cuota normalizada, sin el
// margen de la casa). Dato externo: se muestra siempre, también antes del pitido.
function OddCell({
  label,
  sub,
  odd,
  implied,
  best,
}: {
  label: string;
  sub: string;
  odd: number | null;
  implied: number | null;
  best: number | null;
}) {
  const isFav = odd != null && odd === best;
  return (
    <div
      className={`flex flex-col items-center rounded-xl border py-2 ${
        isFav ? "border-primary bg-primary/10" : "border-border bg-muted/40"
      }`}
    >
      <span className="text-muted-foreground font-mono text-2xs">
        {label} · {sub}
      </span>
      <span
        className={`font-mono text-base font-bold tabular-nums ${isFav ? "text-primary" : ""}`}
      >
        {odd != null ? odd.toFixed(2) : "—"}
      </span>
      {implied != null && (
        <span className="text-muted-foreground font-mono text-3xs">{implied}%</span>
      )}
    </div>
  );
}

export async function OddsSection({ externalId }: { externalId: string | null }) {
  if (!externalId) return null;
  const odds = await getMatchOdds(externalId);
  if (!odds) return null;

  const vals = [odds.home, odds.draw, odds.away];
  const present = vals.filter((o): o is number => o != null);
  const bestOdd = present.length > 0 ? Math.min(...present) : null;

  // Probabilidad implícita: 1/cuota normalizada para quitar el margen de la casa.
  const raw = vals.map((o) => (o ? 1 / o : 0));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const implied = raw.map((r) => Math.round((r / sum) * 100));

  return (
    <SectionCard title="Las apuestas" icon="💰">
      <div className="grid grid-cols-3 gap-2">
        <OddCell label="1" sub="Local" odd={odds.home} implied={odds.home ? implied[0] : null} best={bestOdd} />
        <OddCell label="X" sub="Empate" odd={odds.draw} implied={odds.draw ? implied[1] : null} best={bestOdd} />
        <OddCell label="2" sub="Visitante" odd={odds.away} implied={odds.away ? implied[2] : null} best={bestOdd} />
      </div>
      <p className="text-muted-foreground mt-3 text-2xs">
        Cuotas de {odds.bookmaker} · % = probabilidad implícita
      </p>
    </SectionCard>
  );
}

// ── El pronóstico de la IA (modelo de API-Football) ───────────────────────
export async function AiForecastSection({
  externalId,
  homeTeam,
  awayTeam,
  homeFlag,
  awayFlag,
}: {
  externalId: string | null;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
}) {
  if (!externalId) return null;
  const prediction = await getMatchPrediction(externalId);
  const pct = prediction?.percent;
  if (!pct || pct.home + pct.draw + pct.away === 0) return null;

  return (
    <SectionCard title="El pronóstico de la IA" icon="🤖">
      <TeamsRow homeTeam={homeTeam} awayTeam={awayTeam} homeFlag={homeFlag} awayFlag={awayFlag} />
      <ProbBar home={pct.home} draw={pct.draw} away={pct.away} />
      <p className="text-muted-foreground mt-3 text-2xs">Modelo de API-Football</p>
    </SectionCard>
  );
}
