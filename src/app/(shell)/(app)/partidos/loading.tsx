import { CardGridSkeleton, ChipsSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full rounded-xl" />
      <ChipsSkeleton count={7} />
      <CardGridSkeleton count={6} />
    </div>
  );
}
