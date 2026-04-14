import {
  HeaderSkeleton,
  ToolbarSkeleton,
  TableSkeleton,
  SectionHeaderSkeleton,
  CashBalanceSkeleton,
} from "@/components/skeletons/page-skeleton";

export default function SteelDailyLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <ToolbarSkeleton />
        <TableSkeleton rows={8} columns={8} />

        <div className="mt-8">
          <SectionHeaderSkeleton withButton />
          <TableSkeleton rows={4} columns={4} />
        </div>

        <div className="mt-8">
          <SectionHeaderSkeleton />
          <TableSkeleton rows={4} columns={5} />
        </div>

        <div className="mt-8">
          <CashBalanceSkeleton />
        </div>
      </div>
    </div>
  );
}
