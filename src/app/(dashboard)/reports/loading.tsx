import { HeaderSkeleton, ToolbarSkeleton, KPIGridSkeleton } from "@/components/skeletons/page-skeleton";

export default function ReportsLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <ToolbarSkeleton />
        <KPIGridSkeleton />
      </div>
    </div>
  );
}
