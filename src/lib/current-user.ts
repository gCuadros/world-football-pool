import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  rank: number | null;
};

function initials(name: string | null | undefined, email: string): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

/** Devuelve el usuario autenticado enriquecido con su puesto en la clasificación. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { leaderboardSnapshot: true },
  });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    initials: initials(user.name, user.email),
    rank: user.leaderboardSnapshot?.rank ?? null,
  };
}
