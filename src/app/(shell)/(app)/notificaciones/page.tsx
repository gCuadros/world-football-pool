import { Reveal } from "@/components/ui/reveal";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/current-user";
import { getNotifications } from "@/lib/notifications";
import { NotificacionesView } from "@/components/notifications/notificaciones-view";
import Loading from "./loading";

export const metadata = { title: "Notificaciones" };

export default function NotificacionesPage() {
  return (
    <Reveal fallback={<Loading />}>
      <NotificacionesContent />
    </Reveal>
  );
}

async function NotificacionesContent() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifs = await getNotifications(user.id);
  return <NotificacionesView notifs={notifs} />;
}
