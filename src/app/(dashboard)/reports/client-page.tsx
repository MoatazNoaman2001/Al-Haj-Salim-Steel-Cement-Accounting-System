"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, Banknote, Package, Landmark, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatQuantity, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { exportSummaryReport } from "@/lib/export-excel";
import type { Product } from "@/types/database";

interface ReportsClientProps {
  cementSales: { quantity: number; total_amount: number; total_profit: number | null; product_id: string; is_corrected: boolean }[];
  cashierEntries: { debit: number; credit: number; is_corrected: boolean }[];
  deposits: { amount: number }[];
  banks: { name: string; balance: number }[];
  products: Pick<Product, "id" | "name" | "category">[];
  fromDate: string;
  toDate: string;
}

export function ReportsClient({ cementSales, cashierEntries, deposits, banks, products, fromDate, toDate }: ReportsClientProps) {
  const router = useRouter();
  const { isAdmin } = useUser();

  const totalSales = useMemo(() => cementSales.reduce((sum, s) => sum + s.total_amount, 0), [cementSales]);
  const totalProfit = useMemo(() => cementSales.reduce((sum, s) => sum + (s.total_profit ?? 0), 0), [cementSales]);
  const totalQuantity = useMemo(() => cementSales.reduce((sum, s) => sum + s.quantity, 0), [cementSales]);
  const totalDeposits = useMemo(() => deposits.reduce((sum, d) => sum + d.amount, 0), [deposits]);
  const cashierDebit = useMemo(() => cashierEntries.reduce((sum, e) => sum + e.debit, 0), [cashierEntries]);
  const cashierCredit = useMemo(() => cashierEntries.reduce((sum, e) => sum + e.credit, 0), [cashierEntries]);
  const totalBankBalance = useMemo(() => banks.reduce((sum, b) => sum + b.balance, 0), [banks]);

  const productBreakdown = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; total: number; profit: number }> = {};
    for (const sale of cementSales) {
      const product = products.find((p) => p.id === sale.product_id);
      if (!product) continue;
      if (!map[sale.product_id]) map[sale.product_id] = { name: product.name, quantity: 0, total: 0, profit: 0 };
      map[sale.product_id].quantity += sale.quantity;
      map[sale.product_id].total += sale.total_amount;
      map[sale.product_id].profit += sale.total_profit ?? 0;
    }
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [cementSales, products]);

  return (
    <div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex items-center gap-2">
            <Label>من</Label>
            <Input type="date" value={fromDate} onChange={(e) => router.push(`/reports?from=${e.target.value}&to=${toDate}`)} dir="ltr" className="flex-1 sm:w-40 sm:flex-none" />
          </div>
          <div className="flex items-center gap-2">
            <Label>إلى</Label>
            <Input type="date" value={toDate} onChange={(e) => router.push(`/reports?from=${fromDate}&to=${e.target.value}`)} dir="ltr" className="flex-1 sm:w-40 sm:flex-none" />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => exportSummaryReport(fromDate, toDate, totalSales, totalQuantity, totalProfit, totalDeposits, cashierDebit, cashierCredit, banks, productBreakdown, isAdmin)}
        >
          <Download className="h-4 w-4" /><span className="hidden sm:inline">تصدير Excel</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-green-600" /><span className="text-sm text-muted-foreground">إجمالي المبيعات</span></div>
          <p className="text-2xl font-bold">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatQuantity(totalQuantity)} طن</p>
        </CardContent></Card>
        {isAdmin && (
          <Card><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1"><Banknote className="h-4 w-4 text-blue-600" /><span className="text-sm text-muted-foreground">إجمالي الأرباح</span></div>
            <p className={cn("text-2xl font-bold", totalProfit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(totalProfit)}</p>
          </CardContent></Card>
        )}
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="h-4 w-4 text-red-600" /><span className="text-sm text-muted-foreground">إجمالي الإيداعات</span></div>
          <p className="text-2xl font-bold">{formatCurrency(totalDeposits)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Landmark className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">أرصدة البنوك</span></div>
          <p className="text-2xl font-bold">{formatCurrency(totalBankBalance)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">ملخص يومية الكاشير</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-muted-foreground">إجمالي عليه (خروج)</span><span className="font-bold text-red-600">{formatCurrency(cashierDebit)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">إجمالي له (دخول)</span><span className="font-bold text-green-600">{formatCurrency(cashierCredit)}</span></div>
              <div className="border-t pt-2 flex justify-between"><span className="font-bold">الفرق</span><span className={cn("font-bold", cashierCredit - cashierDebit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(cashierCredit - cashierDebit)}</span></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">أرصدة البنوك</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[200px] overflow-auto">
              {banks.map((bank, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{bank.name}</span>
                  <span className="font-medium">{formatCurrency(bank.balance)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" />تفصيل المبيعات حسب الصنف</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border-t overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">الصنف</TableHead>
                  <TableHead className="text-start">الكمية</TableHead>
                  <TableHead className="text-start">الإجمالي</TableHead>
                  {isAdmin && <TableHead className="text-start">الأرباح</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {productBreakdown.length ? productBreakdown.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{formatQuantity(row.quantity)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(row.total)}</TableCell>
                    {isAdmin && <TableCell className={cn("font-bold", row.profit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(row.profit)}</TableCell>}
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="h-16 text-center text-muted-foreground">لا توجد مبيعات في هذه الفترة</TableCell></TableRow>
                )}
              </TableBody>
              {productBreakdown.length > 0 && (
                <TableFooter>
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>{formatQuantity(totalQuantity)}</TableCell>
                    <TableCell>{formatCurrency(totalSales)}</TableCell>
                    {isAdmin && <TableCell className={cn(totalProfit >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(totalProfit)}</TableCell>}
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
