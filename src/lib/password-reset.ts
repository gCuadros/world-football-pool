import "server-only";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Crea un token de restablecimiento para un email (reutiliza VerificationToken).
 * Guarda el token HASHEADO; devuelve el token en claro para el enlace.
 * Invalida tokens previos del mismo email (uno activo a la vez).
 */
export async function createResetToken(email: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  const token = hashToken(raw);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires: new Date(Date.now() + TTL_MS) },
  });

  return raw;
}

/**
 * Valida un token y, si es correcto, actualiza la contraseña y consume el token.
 * Devuelve true si se restableció.
 */
export async function consumeResetToken(
  email: string,
  rawToken: string,
  newPassword: string,
): Promise<boolean> {
  const token = hashToken(rawToken);
  const row = await prisma.verificationToken.findUnique({ where: { token } });

  if (!row || row.identifier !== email || row.expires < new Date()) {
    return false;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return false;

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { email }, data: { passwordHash } });

  // Consume el token (y cualquier otro del mismo email).
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  return true;
}
