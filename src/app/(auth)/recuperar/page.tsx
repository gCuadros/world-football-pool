import { Trophy } from "lucide-react";

import { RequestResetForm } from "@/components/auth/request-reset-form";

export const metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 font-mono text-base font-bold tracking-tight">
          <Trophy className="text-primary size-5" />
          QUINIELA
          <span className="text-muted-foreground font-normal">· Mundial 2026</span>
        </div>
        <h1 className="text-2xl font-bold">Recuperar contraseña</h1>
        <p className="text-muted-foreground mt-1 mb-6 text-sm">
          Introduce tu email y te enviaremos un enlace para crear una nueva
          contraseña.
        </p>
        <RequestResetForm />
      </div>
    </main>
  );
}
