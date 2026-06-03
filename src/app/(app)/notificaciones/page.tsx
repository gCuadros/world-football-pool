import { Suspense } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getNotifications } from "@/lib/notifications";
import { NotificacionesView } from "@/components/notifications/notificaciones-view";
import Loading from "./loading";

export const metadata = { title: "Notificaciones" };

export default function NotificacionesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NotificacionesContent />
    </Suspense>
  );
}

async function NotificacionesContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifs = await getNotifications(user.id);
  return <NotificacionesView notifs={notifs} />;
}
