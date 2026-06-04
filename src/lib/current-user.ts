import { cache } from "react";

import { auth } from "@/auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatar: string | null;
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

/**
 * Usuario autenticado a partir de la SESIÓN (JWT), sin tocar la base de datos.
 * Memoizado por petición (React cache). El puesto en la clasificación se obtiene
 * aparte con `getUserRank` (leaderboard cacheado), para no consultar la BD en
 * cada navegación. La existencia del usuario la cubren el proxy y `/login`.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const email = session.user.email ?? "";
  const name = session.user.name ?? email;
  return {
    id: session.user.id,
    name,
    email,
    initials: initials(session.user.name, email),
    avatar: session.user.image ?? null,
  };
});
