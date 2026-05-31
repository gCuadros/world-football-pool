import type { NextAuthConfig } from "next-auth";

// Configuración base, segura para el runtime edge (sin Prisma ni bcrypt).
// La usa el middleware para proteger rutas. La config completa (con el
// proveedor de credenciales) vive en `src/auth.ts` (runtime Node).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // /login es siempre accesible. La redirección de usuarios YA logueados
      // se hace en la propia página validando contra la BD: así una cookie de
      // sesión obsoleta (p. ej. tras borrar/recrear usuarios) no provoca un
      // bucle de redirecciones (el proxy solo ve el JWT, no la BD).
      if (pathname.startsWith("/login")) return true;

      // El resto de rutas (la app) requieren sesión.
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
