"use client";

// Dashboard data — IndexedDB-cached read-only summary.
//
// Strategy:
//   - Run the same parallel fetch from the BROWSER (Supabase JS client).
//   - React Query persists the result to IndexedDB via createIDBPersister.
//   - On reload while offline: PersistQueryClientProvider rehydrates the
//     cache from IDB and the dashboard renders the last-known totals.
//   - Server-side page fetch is passed as initialData so first paint stays
//     fast when online.
//
// Trade-off vs. PowerSync: the cache reflects the last successful fetch from
// THIS device — entries created on another device while you're offline won't
// appear until you reconnect and the query refetches. Dashboard is a summary
// only, so this is acceptable.

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DashboardData } from "@/app/(dashboard)/dashboard/client-page";

interface CementRowJoined {
  total_amount: number | null;
  quantity: number | null;
  total_profit: number | null;
  is_corrected: boolean;
  product: { category: string } | null;
}
interface BankRow { id: string; name: string; balance: number }
interface BalanceRow { balance: number }

async function fetchDashboardData(today: string): Promise<DashboardData> {
  const supabase = createClient();

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
  const cashierDebit  = cashierRows.reduce((s, r) => s + (r.debit  ?? 0), 0);
  const cashierCredit = cashierRows.reduce((s, r) => s + (r.credit ?? 0), 0);

  const depositsTotal = ((depositsRes.data ?? []) as { amount: number }[]).reduce((s, d) => s + (d.amount ?? 0), 0);
  const opening = (cashBalanceRes.data?.opening_balance ?? 0) as number;
  const totalSales = sumRevenue(cementRows);

  const banks = ((banksRes.data ?? []) as BankRow[]).map((b) => ({ ...b, balance: Number(b.balance ?? 0) }));

  const custBalances = ((custBalRes.data ?? []) as BalanceRow[]).map((r) => Number(r.balance ?? 0));
  const supBalances  = ((supBalRes.data ?? [])  as BalanceRow[]).map((r) => Number(r.balance ?? 0));
  const resBalances  = ((resBalRes.data ?? [])  as BalanceRow[]).map((r) => Number(r.balance ?? 0));

  const receivablesRows = custBalances.filter((b) => b > 0);
  const payablesRows = supBalances.filter((b) => b < 0);
  const reservationsRows = resBalances.filter((b) => b > 0);

  return {
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
}

export function useDashboardData(initial: DashboardData) {
  const today = initial.today;

  const query = useQuery({
    queryKey: ["dashboard", today],
    queryFn: () => fetchDashboardData(today),
    initialData: initial,
    // First-paint with server data, then refresh once on mount, then every minute
    // while the page is open. networkMode "offlineFirst" returns cached data
    // immediately when offline rather than throwing.
    staleTime: 30 * 1000,
    refetchOnMount: "always",
    refetchInterval: 60 * 1000,
    networkMode: "offlineFirst",
  });

  return {
    data: query.data ?? initial,
    isFetching: query.isFetching,
    isOffline: query.isError && !!query.data,
    error: query.error,
  };
}
