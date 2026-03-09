import { HeaderSkeleton, ToolbarSkeleton, TableSkeleton, CardSkeleton } from "@/components/skeletons/page-skeleton";

export default function CustomerDetailLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <ToolbarSkeleton />
        <div className="grid grid-cols-3 gap-4 mb-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        <TableSkeleton rows={10} columns={9} />
      </div>
    </div>
  );
}
