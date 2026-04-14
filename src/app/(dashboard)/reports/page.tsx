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

  let cementSales: any[] = [];
  let cashierEntries: any[] = [];
  let deposits: any[] = [];
  let banks: any[] = [];
  let products: any[] = [];

  try {
    const [csRes, ceRes, dRes, bRes, pRes] = await Promise.all([
      supabase.from("daily_cement").select("quantity, total_amount, total_profit, product_id, is_corrected")
        .gte("entry_date", fromDate).lte("entry_date", toDate).eq("is_corrected", false),
      supabase.from("daily_cashier").select("debit, credit, is_corrected")
        .gte("entry_date", fromDate).lte("entry_date", toDate).eq("is_corrected", false),
      supabase.from("daily_deposits").select("amount").gte("entry_date", fromDate).lte("entry_date", toDate),
      supabase.from("banks").select("name, balance").eq("is_active", true),
      supabase.from("products").select("id, name, category").eq("is_active", true),
    ]);
    cementSales = csRes.data ?? [];
    cashierEntries = ceRes.data ?? [];
    deposits = dRes.data ?? [];
    banks = bRes.data ?? [];
    products = pRes.data ?? [];
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="التقارير" />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <ReportsClient
          cementSales={cementSales} cashierEntries={cashierEntries}
          deposits={deposits} banks={banks} products={products}
          fromDate={fromDate} toDate={toDate}
        />
      </div>
    </div>
  );
}
