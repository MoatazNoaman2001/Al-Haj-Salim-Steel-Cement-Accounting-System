import {
  HeaderSkeleton,
  ToolbarSkeleton,
  TableSkeleton,
} from "@/components/skeletons/page-skeleton";

export default function CashierDailyLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <ToolbarSkeleton />
        <TableSkeleton rows={8} columns={6} />
      </div>
    </div>
  );
}
