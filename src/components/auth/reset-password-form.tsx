"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { resetPassword, type ResetActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const empty: ResetActionState = {};

export function ResetPasswordForm({
  email,
  token,
}: {
  email: string;
  token: string;
}) {
  const [state, dispatch, pending] = useActionState(resetPassword, empty);

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
          {state.error}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          required
        />
        {state.fieldErrors?.password?.length ? (
          <p className="text-destructive text-xs">{state.fieldErrors.password[0]}</p>
        ) : null}
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Cambiar contraseña
      </Button>
      <p className="text-center">
        <Link href="/login" className="text-muted-foreground text-sm hover:underline">
          Volver a entrar
        </Link>
      </p>
    </form>
  );
}
