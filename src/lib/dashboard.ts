import "server-only";

import {
  getUserLeagues,
  getLeagueLeaderboard,
} from "@/lib/leaderboard";
import { getMatchesBase, getMatchesViewForLeague } from "@/lib/queries";
import type { MatchBase } from "@/lib/queries";

export type DashboardLeague = {
  id: string;
  name: string;
  memberCount: number;
  rank: number | null;
  points: number;
  accuracy: number;
};

export type DashboardData = {
  leagues: DashboardLeague[];
  liveMatches: MatchBase[];
  upcomingMatches: MatchBase[];
  pendingCount: number; // predicciones pendientes en la liga principal
  primaryLeagueId: string | null;
};

/**
 * Datos del dashboard del usuario logueado: sus ligas con posición, partidos en
 * vivo, próximos partidos y predicciones pendientes en la liga principal.
 * Compone funciones cacheadas existentes (clasificación por liga + calendario).
 */
export async function getDashboardData(userId: string): Promise<DashboardData> {
  const [leagues, base] = await Promise.all([
    getUserLeagues(userId),
    getMatchesBase(),
  ]);

  // Posición del usuario en cada liga (clasificación cacheada por liga).
  const leaguesWithRank: DashboardLeague[] = await Promise.all(
    leagues.map(async (l) => {
      const rows = await getLeagueLeaderboard(l.id, userId);
      const me = rows.find((r) => r.userId === userId);
      return {
        id: l.id,
        name: l.name,
        memberCount: l.memberCount,
        rank: me?.rank ?? null,
        points: me?.points ?? 0,
        accuracy: me?.accuracy ?? 0,
      };
    }),
  );

  const liveMatches = base.filter((m) => m.status === "LIVE");
  const upcomingMatches = base
    .filter((m) => m.status === "UPCOMING")
    .slice(0, 6);

  // Predicciones pendientes en la liga principal (primera por antigüedad).
  const primaryLeagueId = leagues[0]?.id ?? null;
  let pendingCount = 0;
  if (primaryLeagueId) {
    const view = await getMatchesViewForLeague(userId, primaryLeagueId);
    pendingCount = view.filter(
      (m) => m.status === "UPCOMING" && !m.locked && !m.prediction,
    ).length;
  }

  return {
    leagues: leaguesWithRank,
    liveMatches,
    upcomingMatches,
    pendingCount,
    primaryLeagueId,
  };
}
