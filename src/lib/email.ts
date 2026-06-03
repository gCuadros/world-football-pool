import "server-only";

/**
 * Envía un email. Usa Resend si hay RESEND_API_KEY; si no, escribe el contenido
 * en los logs del servidor (fallback para desarrollo / sin proveedor).
 */
async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `[email:fallback] Para: ${opts.to}\nAsunto: ${opts.subject}\n${opts.text}`,
    );
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(key);
  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Quiniela Mundial 2026 <onboarding@resend.dev>",
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

/** Email de restablecimiento de contraseña con el enlace. */
export async function sendPasswordResetEmail(
  to: string,
  url: string,
): Promise<void> {
  const subject = "Restablece tu contraseña · Quiniela Mundial 2026";
  const text = `Has solicitado restablecer tu contraseña.\n\nAbre este enlace (caduca en 1 hora):\n${url}\n\nSi no fuiste tú, ignora este email.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h1 style="font-size:18px;color:#0b1f3a">Restablece tu contraseña</h1>
      <p style="color:#4a6b8a;font-size:14px;line-height:1.6">
        Has solicitado restablecer tu contraseña de la Quiniela del Mundial 2026.
        El enlace caduca en 1 hora.
      </p>
      <p style="margin:24px 0">
        <a href="${url}" style="background:#0066b2;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#4a6b8a;font-size:12px">
        Si no fuiste tú, puedes ignorar este email.
      </p>
    </div>`;
  await sendEmail({ to, subject, html, text });
}
