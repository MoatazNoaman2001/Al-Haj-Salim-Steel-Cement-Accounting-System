import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { DashboardClient } from "./client-page";

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();

  let totalSales = 0, salesCount = 0, totalDebit = 0, totalCredit = 0;
  let cashierBalanced = false, cashierCount = 0, totalDeposits = 0, cashBalance = 0;
  let customersCount = 0, productsCount = 0;

  try {
    const [cementResult, cashierResult, depositsResult, cashBalanceResult, customersResult, productsResult] = await Promise.all([
      supabase.from("daily_cement").select("total_amount, is_corrected").eq("entry_date", today),
      supabase.from("daily_cashier").select("debit, credit, is_corrected").eq("entry_date", today),
      supabase.from("daily_deposits").select("amount").eq("entry_date", today),
      supabase.from("daily_cash_balance").select("*").eq("balance_date", today).maybeSingle(),
      supabase.from("customers").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("category", "cement"),
    ]);

    const activeCement = ((cementResult.data ?? []) as { total_amount: number; is_corrected: boolean }[]).filter((e) => !e.is_corrected);
    totalSales = activeCement.reduce((sum, e) => sum + (e.total_amount ?? 0), 0);
    salesCount = activeCement.length;

    const activeCashier = ((cashierResult.data ?? []) as { debit: number; credit: number; is_corrected: boolean }[]).filter((e) => !e.is_corrected);
    totalDebit = activeCashier.reduce((sum, e) => sum + (e.debit ?? 0), 0);
    totalCredit = activeCashier.reduce((sum, e) => sum + (e.credit ?? 0), 0);
    cashierBalanced = totalDebit === totalCredit && activeCashier.length > 0;
    cashierCount = activeCashier.length;

    const deposits = (depositsResult.data ?? []) as { amount: number }[];
    totalDeposits = deposits.reduce((sum, d) => sum + (d.amount ?? 0), 0);

    const openingBalance = cashBalanceResult.data?.opening_balance ?? 0;
    cashBalance = openingBalance + totalSales - totalDeposits;

    customersCount = customersResult.count ?? 0;
    productsCount = productsResult.count ?? 0;
  } catch {
    // Offline — show zeros, client-side cache will provide data
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="لوحة التحكم" />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <DashboardClient
          totalSales={totalSales}
          salesCount={salesCount}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
          cashierBalanced={cashierBalanced}
          cashierCount={cashierCount}
          totalDeposits={totalDeposits}
          cashBalance={cashBalance}
          customersCount={customersCount}
          productsCount={productsCount}
        />
      </div>
    </div>
  );
}
