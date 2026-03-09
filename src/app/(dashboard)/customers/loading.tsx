import { HeaderSkeleton, ToolbarSkeleton, TableSkeleton } from "@/components/skeletons/page-skeleton";

export default function CustomersLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <ToolbarSkeleton />
        <TableSkeleton rows={10} columns={7} />
      </div>
    </div>
  );
}
