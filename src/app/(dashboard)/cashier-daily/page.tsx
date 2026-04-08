import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { CashierDailyClient } from "./client-page";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function CashierDailyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const date = params.date || todayISO();
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let entries: any[] = [];
  try {
    const { data } = await supabase
      .from("daily_cashier")
      .select(`*, creator:profiles!created_by(id, full_name)`)
      .eq("entry_date", date)
      .order("row_number", { ascending: true });
    entries = data ?? [];
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="يومية الكاشير" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <CashierDailyClient data={entries} initialDate={date} />
      </div>
    </div>
  );
}
