import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser, isPushConfigured } from "@/lib/web-push";

// Herramienta de diagnóstico (no función de producto): restringida al
// responsable. Ocultar el botón no basta — la ruta también lo exige.
const DIAGNOSTICS_EMAIL = "gonzalo.cuadros@gmail.com";

// POST /api/push/test — envía un push de prueba al usuario actual para
// verificar de un vistazo si la entrega push funciona en este dispositivo
// (mismo camino que las notificaciones de gol).
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (session.user.email !== DIAGNOSTICS_EMAIL) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Push no configurado en el servidor" }, { status: 503 });
  }

  const subs = await prisma.pushSubscription.count({
    where: { userId: session.user.id },
  });
  if (subs === 0) {
    return NextResponse.json(
      { error: "Sin suscripción en este dispositivo" },
      { status: 409 },
    );
  }

  await sendPushToUser(session.user.id, {
    title: "⚽ Notificación de prueba",
    body: "Si ves esto, las notificaciones funcionan.",
    link: "/resultados",
  });

  return NextResponse.json({ ok: true, devices: subs });
}
