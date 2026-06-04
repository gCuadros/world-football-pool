import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getPublicPredictions } from "@/lib/queries";
import { ProfileView } from "@/components/profile/profile-view";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { profile } = await getPublicPredictions(userId);
  return { title: profile ? `${profile.name} · Perfil` : "Perfil" };
}

export default function PerfilPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  return (
    <Suspense fallback={<PerfilSkeleton />}>
      <PerfilContent params={params} />
    </Suspense>
  );
}

async function PerfilContent({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { profile, predictions } = await getPublicPredictions(userId);
  if (!profile) notFound();

  return <ProfileView profile={profile} predictions={predictions} />;
}

function PerfilSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Skeleton className="h-28 rounded-2xl" />
      <Skeleton className="h-16 rounded-xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
