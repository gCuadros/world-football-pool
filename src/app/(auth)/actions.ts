"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  loginSchema,
  registerSchema,
  resetRequestSchema,
  resetSchema,
} from "@/lib/validations";
import { createResetToken, consumeResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const DEFAULT_REDIRECT = "/partidos";

/** Solo acepta rutas internas relativas (evita open redirects). */
function safeNext(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function signInWithGoogle() {
  await signIn("google", { redirectTo: DEFAULT_REDIRECT });
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeNext(formData.get("next")) ?? DEFAULT_REDIRECT,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o contraseña incorrectos." };
    }
    throw error; // re-lanza el redirect de Next.js
  }

  return {};
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con ese email." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, avatar: initials(name) },
  });

  try {
    // Con invitación (next) vamos directos a unirse; si no, vídeo de bienvenida.
    await signIn("credentials", {
      email,
      password,
      redirectTo: safeNext(formData.get("next")) ?? "/bienvenida",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta creada, pero falló el inicio de sesión automático." };
    }
    throw error;
  }

  return {};
}

export type ResetActionState = {
  error?: string;
  sent?: boolean;
  fieldErrors?: Record<string, string[]>;
};

export async function requestPasswordReset(
  _prev: ResetActionState,
  formData: FormData,
): Promise<ResetActionState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Solo enviamos si existe, pero respondemos igual en ambos casos (no filtrar).
  if (user) {
    const raw = await createResetToken(email);
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    const origin = host ? `${proto}://${host}` : "";
    const url = `${origin}/restablecer?email=${encodeURIComponent(email)}&token=${raw}`;
    await sendPasswordResetEmail(email, url);
  }

  return { sent: true };
}

export async function resetPassword(
  _prev: ResetActionState,
  formData: FormData,
): Promise<ResetActionState> {
  const parsed = resetSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const ok = await consumeResetToken(
    parsed.data.email,
    parsed.data.token,
    parsed.data.password,
  );
  if (!ok) {
    return {
      error: "El enlace no es válido o ha caducado. Solicita uno nuevo.",
    };
  }

  redirect("/login?reset=1");
}
