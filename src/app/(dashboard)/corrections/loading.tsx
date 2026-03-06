import {
  HeaderSkeleton,
  TableSkeleton,
} from "@/components/skeletons/page-skeleton";

export default function CorrectionsLoading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="py-4">
          <TableSkeleton rows={8} columns={6} />
        </div>
      </div>
    </div>
  );
}
