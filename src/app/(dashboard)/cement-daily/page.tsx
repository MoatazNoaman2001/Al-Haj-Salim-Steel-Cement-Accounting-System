import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { CementDailyClient } from "./client-page";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function CementDailyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const date = params.date || todayISO();

  return (
    <div className="flex flex-col h-full">
      <Header title="يومية الاسمنت" />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <CementDailyClient initialDate={date} />
      </div>
    </div>
  );
}
