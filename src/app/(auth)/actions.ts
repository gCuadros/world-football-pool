"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validations";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const DEFAULT_REDIRECT = "/partidos";

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
      redirectTo: DEFAULT_REDIRECT,
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
    // Tras el registro mostramos el vídeo de bienvenida (no en logins normales).
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/bienvenida",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Cuenta creada, pero falló el inicio de sesión automático." };
    }
    throw error;
  }

  return {};
}
