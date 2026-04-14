import { HeaderSkeleton, ToolbarSkeleton, TableSkeleton, CardSkeleton } from "@/components/skeletons/page-skeleton";

export default function BankDetailLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <ToolbarSkeleton />
        <div className="grid grid-cols-3 gap-4 mb-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        <TableSkeleton rows={10} columns={7} />
      </div>
    </div>
  );
}
