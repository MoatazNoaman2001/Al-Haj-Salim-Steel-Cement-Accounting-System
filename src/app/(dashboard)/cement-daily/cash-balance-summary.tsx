"use client";

import { useMemo } from "react";
import { Banknote, ArrowDownToLine, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type {
  DailyCementWithRelations,
  DailyDepositWithCreator,
  DailyCashBalance,
} from "@/types/database";

interface CashBalanceSummaryProps {
  entries: DailyCementWithRelations[];
  deposits: DailyDepositWithCreator[];
  cashBalance: DailyCashBalance | null;
}

export function CashBalanceSummary({
  entries,
  deposits,
  cashBalance,
}: CashBalanceSummaryProps) {
  const summary = useMemo(() => {
    const activeEntries = entries.filter((e) => !e.is_corrected);
    const totalSales = activeEntries.reduce(
      (sum, e) => sum + (e.total_amount ?? 0),
      0
    );
    const totalDeposits = deposits.reduce(
      (sum, d) => sum + (d.amount ?? 0),
      0
    );
    const openingBalance = cashBalance?.opening_balance ?? 0;
    const closingBalance = openingBalance + totalSales - totalDeposits;

    return { totalSales, totalDeposits, openingBalance, closingBalance };
  }, [entries, deposits, cashBalance]);

  return (
    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
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
