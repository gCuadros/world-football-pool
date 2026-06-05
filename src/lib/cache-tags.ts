// Tags de caché para invalidación selectiva (revalidateTag).
export const TAGS = {
  matches: "matches",
  users: "users",
} as const;

export function leagueTag(leagueId: string): string {
  return `league-${leagueId}`;
}
