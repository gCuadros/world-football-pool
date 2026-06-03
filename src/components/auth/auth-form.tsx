"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import {
  loginAction,
  registerAction,
  signInWithGoogle,
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function AuthForm({
  googleEnabled = false,
  next,
}: {
  googleEnabled?: boolean;
  next?: string;
}) {
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

      {googleEnabled ? (
        <form action={signInWithGoogle} className="mb-4">
          <Button type="submit" variant="outline" size="lg" className="w-full">
            <GoogleIcon />
            Continuar con Google
          </Button>
          <div className="mt-4 flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">o con email</span>
            <span className="bg-border h-px flex-1" />
          </div>
        </form>
      ) : null}

      {state.error ? (
        <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-md border px-3 py-2 text-sm">
          {state.error}
        </div>
      ) : null}

      {isLogin ? (
        <form action={loginDispatch} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
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
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">Contraseña</Label>
              <Link
                href="/recuperar"
                className="text-muted-foreground hover:text-primary text-xs transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
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
          {next ? <input type="hidden" name="next" value={next} /> : null}
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
