import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { CementDailyClient } from "./client-page";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function CementDailyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const date = params.date || todayISO();
  const supabase = await createClient();

  const [
    entriesResult,
    customersResult,
    productsResult,
    inventoryResult,
    depositsResult,
    cashBalanceResult,
  ] = await Promise.all([
    supabase
      .from("daily_cement")
      .select(
        `
        *,
        customer:customers!customer_id(id, name),
        product:products!product_id(id, name),
        creator:profiles!created_by(id, full_name)
      `
      )
      .eq("entry_date", date)
      .order("row_number", { ascending: true }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("products")
      .select("id, name")
      .eq("category", "cement")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("daily_inventory")
      .select(
        `
        *,
        product:products!product_id(id, name)
      `
      )
      .eq("entry_date", date),
    supabase
      .from("daily_deposits")
      .select(
        `
        *,
        creator:profiles!created_by(id, full_name)
      `
      )
      .eq("entry_date", date)
      .order("row_number", { ascending: true }),
    supabase
      .from("daily_cash_balance")
      .select("*")
      .eq("balance_date", date)
      .maybeSingle(),
  ]);

  return (
    <div className="flex flex-col h-full">
      <Header title="يومية الاسمنت" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <CementDailyClient
          data={entriesResult.data ?? []}
          customers={customersResult.data ?? []}
          products={productsResult.data ?? []}
          inventory={inventoryResult.data ?? []}
          deposits={depositsResult.data ?? []}
          cashBalance={cashBalanceResult.data ?? null}
          initialDate={date}
        />
      </div>
    </div>
  );
}
