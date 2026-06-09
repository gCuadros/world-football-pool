import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Trophy, Radio, Target, Flame } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";
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
  if (user) redirect(safePath(next) ?? "/partidos");
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
      {/* Panel de marca */}
      <section className="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(120% 120% at 0% 0%, #0a4f8a 0%, transparent 55%), radial-gradient(120% 120% at 100% 100%, #004a87 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
            <Trophy className="size-6" />
            QUINIELA
            <span className="text-primary-foreground/60 font-normal">
              · Mundial 2026
            </span>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-primary-foreground text-4xl leading-tight font-bold">
            Predice los 64 partidos del Mundial y compite con tus amigos.
          </h1>
          <p className="text-primary-foreground/70 mt-4 text-base">
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
                className="border-primary-foreground/15 bg-primary-foreground/5 flex flex-col items-center gap-2 rounded-xl border p-4"
              >
                <Icon className="size-5" />
                <span className="font-mono text-2xs tracking-wide uppercase">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary-foreground/50 relative font-mono text-xs">
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
