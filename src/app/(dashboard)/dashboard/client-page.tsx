"use client";

import {
  FileText,
  Calculator,
  ArrowDownToLine,
  Wallet,
  Users,
  Package,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardClientProps {
  totalSales: number;
  salesCount: number;
  totalDebit: number;
  totalCredit: number;
  cashierBalanced: boolean;
  cashierCount: number;
  totalDeposits: number;
  cashBalance: number;
  customersCount: number;
  productsCount: number;
}

export function DashboardClient({
  totalSales,
  salesCount,
  totalDebit,
  totalCredit,
  cashierBalanced,
  cashierCount,
  totalDeposits,
  cashBalance,
  customersCount,
  productsCount,
}: DashboardClientProps) {
  return (
    <div className="py-6 space-y-6">
      <h3 className="text-lg font-semibold">ملخص اليوم</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Today */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <FileText className="h-4 w-4" />
            مبيعات اليوم
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(totalSales)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {salesCount} عملية
          </p>
        </div>

        {/* Deposits Today */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <ArrowDownToLine className="h-4 w-4" />
            إيداعات اليوم
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(totalDeposits)}
          </p>
        </div>

        {/* Cash Balance */}
        <div className="rounded-lg border bg-primary/5 border-primary/20 p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Wallet className="h-4 w-4" />
            الرصيد النقدي
          </div>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(cashBalance)}
          </p>
        </div>

        {/* Cashier Balance Status */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calculator className="h-4 w-4" />
            يومية الكاشير
          </div>
          {cashierCount > 0 ? (
            <>
              <div className="flex items-center gap-2 mt-1">
                {cashierBalanced ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-bold text-green-600">
                      متزنة
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <span className="text-lg font-bold text-red-600">
                      غير متزنة
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                عليه: {formatCurrency(totalDebit)} | له:{" "}
                {formatCurrency(totalCredit)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              لا توجد قيود اليوم
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            العملاء
          </div>
          <p className="text-2xl font-bold">{customersCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Package className="h-4 w-4" />
            أصناف الاسمنت
          </div>
          <p className="text-2xl font-bold">{productsCount}</p>
        </div>
      </div>
    </div>
  );
}
