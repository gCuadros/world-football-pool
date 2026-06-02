import { Suspense } from "react";
import Link from "next/link";
import { Trophy, Radio, Globe } from "lucide-react";

import { auth } from "@/auth";

// Layout de la zona pública (sin login requerido).
// El auth check vive en un Suspense para no bloquear el prerenderizado.
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-border/50 sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-mono text-sm font-bold tracking-tight"
          >
            <Trophy className="text-primary size-4" />
            QUINIELA <span className="text-muted-foreground font-normal">· 2026</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/resultados"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
            >
              <Radio className="size-3.5" />
              Resultados
            </Link>
            <Link
              href="/mundial"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
            >
              <Globe className="size-3.5" />
              Mundial
            </Link>
          </nav>

          <div className="ml-auto">
            <Suspense fallback={<div className="h-8 w-24" />}>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

async function AuthButton() {
  const session = await auth();
  const isLoggedIn = !!session?.user;

  if (isLoggedIn) {
    return (
      <Link
        href="/ligas"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-1.5 font-mono text-xs font-semibold transition-colors"
      >
        MI QUINIELA
      </Link>
    );
  }
  return (
    <Link
      href="/login"
      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
    >
      Entrar
    </Link>
  );
}
