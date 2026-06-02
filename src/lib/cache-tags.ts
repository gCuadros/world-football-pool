// Tags de caché para invalidación selectiva (revalidateTag).
export const TAGS = {
  matches: "matches",
} as const;

export function leagueTag(leagueId: string): string {
  return `league-${leagueId}`;
}
