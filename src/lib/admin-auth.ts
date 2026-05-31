import "server-only";

/**
 * Valida el secreto de administración de una petición.
 * Acepta `Authorization: Bearer <secret>` o cabecera `x-admin-secret`.
 * Devuelve false (y los endpoints responden 401/503) si no coincide o si
 * ADMIN_SECRET no está configurado.
 */
export function isAdminRequest(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const header = req.headers.get("x-admin-secret");

  return bearer === secret || header === secret;
}
