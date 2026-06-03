"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";

import { requestPasswordReset, type ResetActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const empty: ResetActionState = {};

export function RequestResetForm() {
  const [state, dispatch, pending] = useActionState(requestPasswordReset, empty);

  if (state.sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="bg-primary/10 mx-auto flex size-12 items-center justify-center rounded-2xl">
          <MailCheck className="text-primary size-6" />
        </div>
        <p className="text-sm">
          Si existe una cuenta con ese email, te hemos enviado un enlace para
          restablecer la contraseña. Caduca en 1 hora.
        </p>
        <Link href="/login" className="text-primary text-sm font-medium hover:underline">
          Volver a entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={dispatch} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          required
        />
        {state.fieldErrors?.email?.length ? (
          <p className="text-destructive text-xs">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Enviar enlace
      </Button>
      <p className="text-center">
        <Link href="/login" className="text-muted-foreground text-sm hover:underline">
          Volver a entrar
        </Link>
      </p>
    </form>
  );
}
