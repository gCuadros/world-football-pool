import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next.js 16: convención "proxy" (sustituye a "middleware").
// Edge-safe: usa solo la config base (sin Prisma/bcrypt). El callback
// `authorized` de authConfig protege las rutas y gestiona los redirects.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  void req;
});

export const config = {
  // Protege todo menos assets estáticos y las rutas de NextAuth.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
