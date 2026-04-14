import { HeaderSkeleton, CardSkeleton, TableSkeleton } from "@/components/skeletons/page-skeleton";

export default function BanksLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <div className="py-4"><CardSkeleton /></div>
        <TableSkeleton rows={10} columns={5} />
      </div>
    </div>
  );
}
