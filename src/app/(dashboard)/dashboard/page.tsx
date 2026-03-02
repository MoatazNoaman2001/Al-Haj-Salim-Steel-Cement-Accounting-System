import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { DashboardClient } from "./client-page";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();

  const [
    cementResult,
    cashierResult,
    depositsResult,
    cashBalanceResult,
    customersResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("daily_cement")
      .select("total_amount, is_corrected")
      .eq("entry_date", today),
    supabase
      .from("daily_cashier")
      .select("debit, credit, is_corrected")
      .eq("entry_date", today),
    supabase
      .from("daily_deposits")
      .select("amount")
      .eq("entry_date", today),
    supabase
      .from("daily_cash_balance")
      .select("*")
      .eq("balance_date", today)
      .maybeSingle(),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("category", "cement"),
  ]);

  const cementEntries = (cementResult.data ?? []) as {
    total_amount: number;
    is_corrected: boolean;
  }[];
  const activeCement = cementEntries.filter((e) => !e.is_corrected);
  const totalSales = activeCement.reduce(
    (sum, e) => sum + (e.total_amount ?? 0),
    0
  );
  const salesCount = activeCement.length;

  const cashierEntries = (cashierResult.data ?? []) as {
    debit: number;
    credit: number;
    is_corrected: boolean;
  }[];
  const activeCashier = cashierEntries.filter((e) => !e.is_corrected);
  const totalDebit = activeCashier.reduce((sum, e) => sum + (e.debit ?? 0), 0);
  const totalCredit = activeCashier.reduce(
    (sum, e) => sum + (e.credit ?? 0),
    0
  );
  const cashierBalanced =
    totalDebit === totalCredit && activeCashier.length > 0;

  const deposits = (depositsResult.data ?? []) as { amount: number }[];
  const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const openingBalance = cashBalanceResult.data?.opening_balance ?? 0;
  const cashBalance = openingBalance + totalSales - totalDeposits;

  return (
    <div className="flex flex-col h-full">
      <Header title="لوحة التحكم" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <DashboardClient
          totalSales={totalSales}
          salesCount={salesCount}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          cashierBalanced={cashierBalanced}
          cashierCount={activeCashier.length}
          totalDeposits={totalDeposits}
          cashBalance={cashBalance}
          customersCount={customersResult.count ?? 0}
          productsCount={productsResult.count ?? 0}
        />
      </div>
    </div>
  );
}
