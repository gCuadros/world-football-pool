"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  loginAction,
  registerAction,
  type AuthActionState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";
const empty: AuthActionState = {};

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-destructive text-xs">{messages[0]}</p>;
}

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("login");
  const [loginState, loginDispatch, loginPending] = useActionState(
    loginAction,
    empty,
  );
  const [registerState, registerDispatch, registerPending] = useActionState(
    registerAction,
    empty,
  );

  const isLogin = mode === "login";
  const state = isLogin ? loginState : registerState;
  const pending = isLogin ? loginPending : registerPending;

  return (
    <div className="w-full max-w-sm">
      {/* Toggle */}
      <div className="bg-muted mb-6 flex rounded-lg p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-md py-2 font-mono text-xs font-medium tracking-wide uppercase transition-colors",
              mode === m
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      {state.error ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-md border px-3 py-2 text-sm">
          {state.error}
        </div>
      ) : null}

      {isLogin ? (
        <form action={loginDispatch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">Email</Label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              defaultValue="gonzalo@quiniela.app"
              required
            />
            <FieldError messages={loginState.fieldErrors?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">Contraseña</Label>
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              defaultValue="password123"
              required
            />
            <FieldError messages={loginState.fieldErrors?.password} />
          </div>
          <SubmitButton pending={pending}>Entrar</SubmitButton>
        </form>
      ) : (
        <form action={registerDispatch} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reg-name">Nombre</Label>
            <Input
              id="reg-name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              required
            />
            <FieldError messages={registerState.fieldErrors?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@email.com"
              required
            />
            <FieldError messages={registerState.fieldErrors?.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Contraseña</Label>
            <Input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              required
            />
            <FieldError messages={registerState.fieldErrors?.password} />
          </div>
          <SubmitButton pending={pending}>Crear cuenta</SubmitButton>
        </form>
      )}

      {isLogin ? (
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Cuenta demo precargada ·{" "}
          <span className="font-mono">password123</span>
        </p>
      ) : null}
    </div>
  );
}

function SubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
