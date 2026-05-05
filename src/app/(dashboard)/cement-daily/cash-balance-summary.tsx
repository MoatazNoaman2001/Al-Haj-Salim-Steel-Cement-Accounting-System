"use client";

import { useMemo } from "react";
import { Banknote, ArrowDownToLine, Wallet, Building2, HandCoins } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCementEntries, useDailyDeposits, useDailyCashBalance } from "@/hooks/use-cement-daily-queries";

interface CashBalanceSummaryProps {
  date: string;
}

export function CashBalanceSummary({ date }: CashBalanceSummaryProps) {
  const { data: entries = [] } = useCementEntries(date);
  const { data: deposits = [] } = useDailyDeposits(date);
  const { data: cashBalance = null } = useDailyCashBalance(date);

  const summary = useMemo(() => {
    const activeEntries = entries.filter((e) => !e.is_corrected);

    const totalSales = activeEntries.reduce(
      (sum, e) => sum + (e.total_amount ?? 0) + (e.transport_in ?? 0) - (e.tanzeel ?? 0),
      0
    );
    const totalDeposits = deposits.reduce(
      (sum, d) => sum + (d.amount ?? 0),
      0
    );

    // Cash received = amount_paid where NO bank (cash payment)
    const cashReceived = activeEntries
      .filter((e) => !e.bank_id)
      .reduce((sum, e) => sum + (e.amount_paid ?? 0), 0);

    // Bank transfers = amount_paid where bank_id IS set
    const bankTransfers = activeEntries
      .filter((e) => e.bank_id)
      .reduce((sum, e) => sum + (e.amount_paid ?? 0), 0);

    const openingBalance = cashBalance?.opening_balance ?? 0;
    const closingBalance = openingBalance + cashReceived - totalDeposits;

    return {
      totalSales,
      totalDeposits,
      openingBalance,
      closingBalance,
      cashReceived,
      bankTransfers,
    };
  }, [entries, deposits, cashBalance]);

  return (
    <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Wallet className="h-4 w-4" />
          الرصيد الافتتاحي
        </div>
        <p className="text-xl font-bold">
          {formatCurrency(summary.openingBalance)}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Banknote className="h-4 w-4" />
          إجمالي المبيعات
        </div>
        <p className="text-xl font-bold text-green-600">
          {formatCurrency(summary.totalSales)}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <HandCoins className="h-4 w-4" />
          النقدي المحصل
        </div>
        <p className="text-xl font-bold text-blue-600">
          {formatCurrency(summary.cashReceived)}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Building2 className="h-4 w-4" />
          المحول للبنوك
        </div>
        <p className="text-xl font-bold text-purple-600">
          {formatCurrency(summary.bankTransfers)}
        </p>
      </div>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <ArrowDownToLine className="h-4 w-4" />
          إجمالي الإيداعات
        </div>
        <p className="text-xl font-bold text-orange-600">
          {formatCurrency(summary.totalDeposits)}
        </p>
      </div>
      <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <Wallet className="h-4 w-4" />
          الرصيد النقدي
        </div>
        <p className="text-2xl font-bold text-primary">
          {formatCurrency(summary.closingBalance)}
        </p>
      </div>
    </div>
  );
}