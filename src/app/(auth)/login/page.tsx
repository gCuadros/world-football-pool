import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Trophy, Radio, Target, Flame } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
import { PitchLines } from "@/components/ui/pitch-lines";
import { googleEnabled } from "@/auth";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = { title: "Entrar" };

// Comprobación de sesión (dinámica) aislada en Suspense: si ya hay sesión válida
// en BD, redirige a la app; si no, no renderiza nada y se muestra el login.
// (Validar contra BD evita el bucle con cookies de sesión obsoletas.)
function safePath(value: string | undefined): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

type SearchParams = Promise<{ next?: string }>;

async function SessionGate({ searchParams }: { searchParams: SearchParams }) {
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    user = null;
  }
  const { next } = await searchParams;
  // /resultados directo: /partidos es solo un redirect de compatibilidad y
  // encadenaría dos saltos de servidor tras el login.
  if (user) redirect(safePath(next) ?? "/resultados");
  return null;
}

async function AuthFormSlot({
  searchParams,
  googleEnabled,
}: {
  searchParams: SearchParams;
  googleEnabled: boolean;
}) {
  const { next } = await searchParams;
  return <AuthForm googleEnabled={googleEnabled} next={safePath(next)} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <Suspense fallback={null}>
        <SessionGate searchParams={searchParams} />
      </Suspense>
      {/* Panel de marca: "estadio de noche" con líneas de campo */}
      <section className="bg-aurora relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <PitchLines />
        <div className="relative">
          <div className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
            <Trophy className="size-6" />
            QUINIELA
            <span className="font-normal text-white/60">· Mundial 2026</span>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl leading-tight font-bold">
            Predice los 64 partidos del{" "}
            <span className="text-gradient-hero">Mundial</span> y compite con
            tus amigos.
          </h1>
          <p className="mt-4 text-base text-white/70">
            Marcador exacto vale 3 puntos, acertar el resultado 1. Sube en la
            clasificación, crea tu mini-liga y desbloquea logros.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: Radio, label: "En directo" },
              { icon: Target, label: "Predicciones" },
              { icon: Flame, label: "Rachas" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl bg-white/10 p-4 ring-1 ring-white/15"
              >
                <Icon className="size-5" />
                <span className="font-mono text-2xs tracking-wide uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-xs text-white/50">
          11 jun – 19 jul 2026 · 16 sedes · USA · México · Canadá
        </p>
      </section>

      {/* Panel de formulario */}
      <section className="flex flex-col items-center justify-center p-8">
        <div className="mb-8 flex items-center gap-2 font-mono text-base font-bold tracking-tight lg:hidden">
          <Trophy className="text-primary size-5" />
          QUINIELA
          <span className="text-muted-foreground font-normal">· Mundial 2026</span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold">Bienvenido de nuevo</h2>
          <p className="text-muted-foreground mt-1 mb-6 text-sm">
            Entra para gestionar tus predicciones y ver la clasificación.
          </p>
          <Suspense fallback={<AuthForm googleEnabled={googleEnabled} />}>
            <AuthFormSlot searchParams={searchParams} googleEnabled={googleEnabled} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
