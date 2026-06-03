import { Suspense } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = { title: "Restablecer contraseña" };

type SearchParams = Promise<{ email?: string; token?: string }>;

export default function RestablecerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 font-mono text-base font-bold tracking-tight">
          <Trophy className="text-primary size-5" />
          QUINIELA
          <span className="text-muted-foreground font-normal">· Mundial 2026</span>
        </div>
        <h1 className="text-2xl font-bold">Nueva contraseña</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          Elige una contraseña nueva para tu cuenta.
        </p>
        <Suspense fallback={null}>
          <ResetSlot searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function ResetSlot({ searchParams }: { searchParams: SearchParams }) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <div className="space-y-4">
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          El enlace no es válido o está incompleto.
        </div>
        <Link href="/recuperar" className="text-primary text-sm font-medium hover:underline">
          Solicitar uno nuevo
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm email={email} token={token} />;
}
