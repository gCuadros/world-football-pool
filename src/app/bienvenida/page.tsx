import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Trophy, ArrowRight } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";

export const metadata = { title: "Bienvenido" };

export default function BienvenidaPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-background" />}>
      <BienvenidaContent />
    </Suspense>
  );
}

async function BienvenidaContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div className="from-primary/10 to-background flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b px-4 py-10">
      <div className="w-full max-w-2xl space-y-6 text-center">
        <span className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-3xs font-bold tracking-[0.15em]">
          <Trophy className="size-3.5" />
          FIFA WORLD CUP 2026
        </span>

        <div className="space-y-3">
          <h1 className="font-mono text-3xl font-bold tracking-tight sm:text-4xl">
            ¡Bienvenido, {firstName}!
          </h1>
          <p className="text-muted-foreground mx-auto max-w-md">
            Esto es la Quiniela del Mundial. Mira el vídeo y prepárate para
            competir con tus amigos.
          </p>
        </div>

        {/* Vídeo de bienvenida (public/world-cup.mp4) */}
        <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
          <video
            className="aspect-video w-full"
            src="/world-cup.mp4"
            controls
            autoPlay
            muted
            playsInline
          />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/ligas"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors sm:w-auto"
          >
            Empezar
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/ligas"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Saltar
          </Link>
        </div>
      </div>
    </div>
  );
}
