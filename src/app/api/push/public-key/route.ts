import { NextResponse } from "next/server";

// GET /api/push/public-key — clave pública VAPID en base64url.
// La usa el service worker para re-suscribirse cuando el navegador rota la
// suscripción (evento `pushsubscriptionchange`), contexto donde no tiene
// acceso a las variables de entorno NEXT_PUBLIC_*.
export function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  return NextResponse.json({ key });
}
