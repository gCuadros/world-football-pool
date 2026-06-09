import { notFound } from "next/navigation";

import type { MatchVM } from "@/lib/queries";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { MatchCard } from "@/components/matches/match-card";
import { HeroMatch } from "@/components/dashboard/hero-match";
import { PredictionCard } from "@/components/predictions/prediction-card";
import { Podium } from "@/components/leaderboard/podium";
import { RankBanner } from "@/components/leaderboard/rank-banner";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { AchievementsWidget } from "@/components/leaderboard/achievements-widget";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { ActiveLeagueBanner } from "@/components/ligas/active-league-banner";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupTable } from "@/components/mundial/group-table";
import { Shield } from "lucide-react";

/**
 * Playground de UI (solo desarrollo): renderiza los componentes clave con
 * datos de prueba para iterar el diseño sin base de datos. No existe en prod.
 */

const NOW = new Date("2026-06-12T18:30:00Z");

function makeMatch(overrides: Partial<MatchVM>): MatchVM {
  return {
    id: "dev-1",
    matchNo: 1,
    externalId: null,
    homeTeam: "México",
    awayTeam: "Argentina",
    homeFlag: "🇲🇽",
    awayFlag: "🇦🇷",
    homeCrest: null,
    awayCrest: null,
    kickoffAt: "2026-06-12T20:00:00Z",
    stage: "GROUP_STAGE",
    group: "A",
    stadium: "Estadio Azteca",
    city: "Ciudad de México",
    homeScore: null,
    awayScore: null,
    status: "UPCOMING",
    liveMinute: null,
    advanced: null,
    prediction: null,
    locked: false,
    ...overrides,
  };
}

const ROWS: LeaderboardRow[] = [1, 2, 3, 4].map((rank) => ({
  rank,
  userId: `dev-u${rank}`,
  name: ["Lucía Torres", "Marc Vidal", "Ana Ruiz", "Pablo Gil"][rank - 1],
  initials: ["LT", "MV", "AR", "PG"][rank - 1],
  avatar: null,
  points: [87, 81, 74, 70][rank - 1],
  accuracy: [64, 58, 55, 51][rank - 1],
  predictionsCount: 24,
  exactCount: 9,
  currentStreak: 3,
  bestStreak: 6,
  isCurrentUser: rank === 2,
}));

export default function DevUiPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const upcoming = makeMatch({});
  const live = makeMatch({
    id: "dev-2",
    homeTeam: "España",
    awayTeam: "Brasil",
    homeFlag: "🇪🇸",
    awayFlag: "🇧🇷",
    status: "LIVE",
    homeScore: 2,
    awayScore: 1,
    liveMinute: 67,
    stadium: "MetLife Stadium",
    city: "Nueva York",
  });
  const finished = makeMatch({
    id: "dev-3",
    homeTeam: "Francia",
    awayTeam: "Países Bajos",
    homeFlag: "🇫🇷",
    awayFlag: "🇳🇱",
    status: "FINISHED",
    homeScore: 0,
    awayScore: 3,
    prediction: { homeScore: 1, awayScore: 2, points: 1, exact: false, advancePick: null },
  });
  const knockout = makeMatch({
    id: "dev-4",
    homeTeam: "Alemania",
    awayTeam: "Inglaterra",
    homeFlag: "🇩🇪",
    awayFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    stage: "ROUND_OF_16",
    group: null,
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-bold">HeroMatch</h2>
        <HeroMatch match={live} now={NOW} />
        <HeroMatch match={upcoming} now={NOW} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">MatchCard</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MatchCard match={upcoming} now={NOW} publicMode />
          <MatchCard match={live} now={NOW} publicMode />
          <MatchCard match={finished} now={NOW} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">PredictionCard</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PredictionCard match={upcoming} now={NOW} leagueId="dev-league" />
          <PredictionCard match={knockout} now={NOW} leagueId="dev-league" />
        </div>
      </section>

      <section className="max-w-md space-y-3">
        <h2 className="text-base font-bold">Podium</h2>
        <Podium rows={ROWS} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">RankBanner</h2>
        <RankBanner
          info={{
            rank: 4,
            totalPlayers: 128,
            points: 70,
            accuracy: 51,
            predictionsCount: 24,
            exactCount: 9,
            currentStreak: 3,
            bestStreak: 6,
            trend: 2,
            percentile: 4,
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">ActiveLeagueBanner</h2>
        <ActiveLeagueBanner
          league={{
            id: "dev-league",
            name: "Peña Los Galácticos",
            inviteCode: "GOL2026",
            memberCount: 12,
            rank: 4,
            points: 70,
          }}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-bold">LeaderboardTable</h2>
        <LeaderboardTable rows={ROWS} />
      </section>

      <section className="max-w-md space-y-3">
        <h2 className="text-base font-bold">AchievementsWidget</h2>
        <AchievementsWidget unlocked={ACHIEVEMENTS.slice(0, 3).map((a) => a.type)} />
      </section>

      <section className="max-w-xl space-y-3">
        <h2 className="text-base font-bold">GroupTable</h2>
        <GroupTable
          highlightTeam="México"
          group={{
            group: "A",
            teams: [
              { rank: 1, teamId: 1, name: "Mexico", nameEs: "México", logo: null, flag: "🇲🇽", played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 5, goalsAgainst: 1, goalDiff: 4, points: 6, form: "WW" },
              { rank: 2, teamId: 2, name: "Canada", nameEs: "Canadá", logo: null, flag: "🇨🇦", played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 3, goalsAgainst: 2, goalDiff: 1, points: 4, form: "WD" },
              { rank: 3, teamId: 3, name: "Poland", nameEs: "Polonia", logo: null, flag: "🇵🇱", played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 1, goalsAgainst: 3, goalDiff: -2, points: 1, form: "DL" },
              { rank: 4, teamId: 4, name: "Tunisia", nameEs: "Túnez", logo: null, flag: "🇹🇳", played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 4, goalDiff: -3, points: 0, form: "LL" },
            ],
          }}
        />
      </section>

      <section className="max-w-md space-y-3">
        <h2 className="text-base font-bold">EmptyState</h2>
        <EmptyState
          icon={Shield}
          title="Calendario no disponible"
          description="El calendario de este equipo aún no está disponible. Vuelve cuando arranque su Mundial."
          action={{ href: "/mundial", label: "Ver grupos" }}
        />
      </section>
    </div>
  );
}
