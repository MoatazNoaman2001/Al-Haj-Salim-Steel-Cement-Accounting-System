import { HeaderSkeleton, KPIGridSkeleton } from "@/components/skeletons/page-skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <div className="py-6">
          <KPIGridSkeleton />
        </div>
      </div>
    </div>
  );
}
