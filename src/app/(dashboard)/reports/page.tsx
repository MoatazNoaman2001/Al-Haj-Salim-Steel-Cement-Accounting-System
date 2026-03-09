import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { ReportsClient } from "./client-page";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const today = todayISO();
  const fromDate = params.from || today.slice(0, 8) + "01";
  const toDate = params.to || today;
  const supabase = await createClient();

  const { data: cementSales } = await supabase
    .from("daily_cement").select("quantity, total_amount, total_profit, product_id, is_corrected")
    .gte("entry_date", fromDate).lte("entry_date", toDate).eq("is_corrected", false);

  const { data: cashierEntries } = await supabase
    .from("daily_cashier").select("debit, credit, is_corrected")
    .gte("entry_date", fromDate).lte("entry_date", toDate).eq("is_corrected", false);

  const { data: deposits } = await supabase
    .from("daily_deposits").select("amount").gte("entry_date", fromDate).lte("entry_date", toDate);

  const { data: banks } = await supabase.from("banks").select("name, balance").eq("is_active", true);

  const { data: products } = await supabase.from("products").select("id, name, category").eq("is_active", true);

  return (
    <div className="flex flex-col h-full">
      <Header title="التقارير" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <ReportsClient
          cementSales={cementSales ?? []} cashierEntries={cashierEntries ?? []}
          deposits={deposits ?? []} banks={banks ?? []} products={products ?? []}
          fromDate={fromDate} toDate={toDate}
        />
      </div>
    </div>
  );
}
