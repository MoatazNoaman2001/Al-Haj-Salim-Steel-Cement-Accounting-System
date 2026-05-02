import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { DashboardClient, type DashboardData } from "./client-page";

interface CementRowJoined {
  total_amount: number | null;
  quantity: number | null;
  total_profit: number | null;
  is_corrected: boolean;
  product: { category: string } | null;
}

interface BankRow { id: string; name: string; balance: number; }
interface BalanceRow { balance: number; }

export default async function DashboardPage() {
  const supabase = await createClient();
  const today = todayISO();

  const empty: DashboardData = {
    today,
    cement: { revenue: 0, quantity: 0, count: 0 },
    steel:  { revenue: 0, quantity: 0, count: 0 },
    profit: 0,
    cashier: { debit: 0, credit: 0, count: 0, balanced: false },
    deposits: 0,
    cashBalance: 0,
    banks: [],
    receivables: { total: 0, count: 0 },
    payables: { total: 0, count: 0 },
    reservationsHeld: { total: 0, count: 0 },
  };

  let data: DashboardData = empty;

  try {
    const [
      cementRes, cashierRes, depositsRes, cashBalanceRes,
      banksRes, custBalRes, supBalRes, resBalRes,
    ] = await Promise.all([
      supabase
        .from("daily_cement")
        .select("total_amount, quantity, total_profit, is_corrected, product:products!product_id(category)")
        .eq("entry_date", today),
      supabase.from("daily_cashier").select("debit, credit, is_corrected").eq("entry_date", today),
      supabase.from("daily_deposits").select("amount").eq("entry_date", today),
      supabase.from("daily_cash_balance").select("opening_balance").eq("balance_date", today).maybeSingle(),
      supabase.from("banks").select("id, name, balance").eq("is_active", true).order("created_at", { ascending: true }),
      supabase.from("customer_balances").select("balance"),
      supabase.from("supplier_balances").select("balance"),
      supabase.from("customer_reservation_balances").select("balance"),
    ]);

    const cementRows = ((cementRes.data ?? []) as unknown as CementRowJoined[]).filter((r) => !r.is_corrected);
    const cement = cementRows.filter((r) => r.product?.category === "cement");
    const steel  = cementRows.filter((r) => r.product?.category === "steel");

    const sumRevenue = (rows: CementRowJoined[]) => rows.reduce((s, r) => s + (r.total_amount ?? 0), 0);
    const sumQty     = (rows: CementRowJoined[]) => rows.reduce((s, r) => s + (r.quantity ?? 0), 0);
    const sumProfit  = (rows: CementRowJoined[]) => rows.reduce((s, r) => s + (r.total_profit ?? 0), 0);

    const cashierRows = ((cashierRes.data ?? []) as { debit: number; credit: number; is_corrected: boolean }[])
      .filter((r) => !r.is_corrected);
    const cashierDebit  = cashierRows.reduce((s, r) => s + (r.debit ?? 0), 0);
    const cashierCredit = cashierRows.reduce((s, r) => s + (r.credit ?? 0), 0);

    const depositsTotal = ((depositsRes.data ?? []) as { amount: number }[]).reduce((s, d) => s + (d.amount ?? 0), 0);
    const opening = (cashBalanceRes.data?.opening_balance ?? 0) as number;
    const totalSales = sumRevenue(cementRows); // cement+steel both live in daily_cement

    const banks = ((banksRes.data ?? []) as BankRow[]).map((b) => ({ ...b, balance: Number(b.balance ?? 0) }));

    const custBalances = ((custBalRes.data ?? []) as BalanceRow[]).map((r) => Number(r.balance ?? 0));
    const supBalances  = ((supBalRes.data ?? [])  as BalanceRow[]).map((r) => Number(r.balance ?? 0));
    const resBalances  = ((resBalRes.data ?? [])  as BalanceRow[]).map((r) => Number(r.balance ?? 0));

    const receivablesRows = custBalances.filter((b) => b > 0);
    const payablesRows = supBalances.filter((b) => b < 0); // negative = we owe
    const reservationsRows = resBalances.filter((b) => b > 0);

    data = {
      today,
      cement: { revenue: sumRevenue(cement), quantity: sumQty(cement), count: cement.length },
      steel:  { revenue: sumRevenue(steel),  quantity: sumQty(steel),  count: steel.length  },
      profit: sumProfit(cementRows),
      cashier: {
        debit: cashierDebit,
        credit: cashierCredit,
        count: cashierRows.length,
        balanced: cashierRows.length > 0 && cashierDebit === cashierCredit,
      },
      deposits: depositsTotal,
      cashBalance: opening + totalSales - depositsTotal,
      banks,
      receivables: { total: receivablesRows.reduce((s, b) => s + b, 0), count: receivablesRows.length },
      payables:    { total: payablesRows.reduce((s, b) => s + Math.abs(b), 0), count: payablesRows.length },
      reservationsHeld: { total: reservationsRows.reduce((s, b) => s + b, 0), count: reservationsRows.length },
    };
  } catch {
    // Offline — render zeros; client can hydrate from PowerSync later.
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="لوحة التحكم" />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <DashboardClient data={data} />
      </div>
    </div>
  );
}
