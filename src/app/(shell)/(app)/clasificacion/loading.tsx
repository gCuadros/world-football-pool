import {
  BannerSkeleton,
  ChipsSkeleton,
  TableSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <BannerSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <ChipsSkeleton count={3} />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <TableSkeleton rows={6} />
        </div>
        <Skeleton className="hidden h-64 rounded-2xl lg:block" />
      </div>
    </div>
  );
}
