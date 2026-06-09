import { CardGridSkeleton, ChipsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <ChipsSkeleton count={4} />
      <CardGridSkeleton count={6} />
    </div>
  );
}
