import type { NextAuthConfig } from "next-auth";

// Rutas accesibles sin sesión (zona pública del Mundial).
const PUBLIC_PATHS = ["/", "/resultados", "/calendario", "/mundial", "/amistosos", "/eliminatorias", "/partido", "/noticias", "/unirse", "/como-funciona"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

// Configuración base, segura para el runtime edge (sin Prisma ni bcrypt).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // /login siempre accesible.
      if (pathname.startsWith("/login")) return true;

      // Zona pública: sin login requerido.
      if (isPublicPath(pathname)) return true;

      // Resto de rutas (zona privada, /liga, /ligas, /ajustes…) requieren sesión.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.picture = (user as { image?: string | null }).image ?? token.picture;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
