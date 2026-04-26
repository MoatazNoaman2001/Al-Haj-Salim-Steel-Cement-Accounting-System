"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowRight, Download } from "lucide-react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CUSTOMER_TX_HEADERS } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useSupplier, useSupplierTransactions } from "@/hooks/use-suppliers-queries";
import { useActiveBanks } from "@/hooks/use-banks-queries";
import { exportSupplierReport } from "@/lib/export-excel";
import { AddSupplierTransactionDialog } from "./add-transaction-dialog";
import type { Supplier, SupplierTransactionWithCreator, Bank } from "@/types/database";

interface SupplierDetailClientProps {
  supplierId: string;
  supplier: Supplier | null;
  transactions: SupplierTransactionWithCreator[];
  banks: Bank[];
}

export function SupplierDetailClient({ supplierId, supplier: serverSupplier, transactions, banks }: SupplierDetailClientProps) {
  const { userId } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: supplier } = useSupplier(supplierId, serverSupplier);
  const { data: txData } = useSupplierTransactions(supplierId, transactions);
  const { data: bankData } = useActiveBanks(banks);

  const bankNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    bankData.forEach((b) => { map[b.id] = b.name; });
    return map;
  }, [bankData]);

  // Supplier running balance: sum(credit - debit).
  //   negative → we still owe the supplier
  //   positive → supplier holds our credit
  const { rows, totalDebit, totalCredit, finalBalance } = useMemo(() => {
    let runningBalance = 0;
    const activeEntries = txData.filter((e) => !e.is_corrected);
    const computedRows = activeEntries.map((entry) => {
      runningBalance += entry.credit - entry.debit;
      return { ...entry, runningBalance };
    });
    const totalDebit = activeEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = activeEntries.reduce((s, e) => s + e.credit, 0);
    return { rows: computedRows, totalDebit, totalCredit, finalBalance: totalCredit - totalDebit };
  }, [txData]);

  if (!supplier) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground">جاري التحميل من الذاكرة المحلية...</div>;
  }

  const balanceLabel =
    finalBalance < 0 ? "علينا للمورد" :
    finalBalance > 0 ? "لنا رصيد عند المورد" : "متزن";
  const balanceClass =
    finalBalance < 0 ? "text-red-600" :
    finalBalance > 0 ? "text-green-600" : "";

  return (
    <div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/suppliers">
            <Button variant="ghost" size="sm" className="gap-1 shrink-0"><ArrowRight className="h-4 w-4" />رجوع</Button>
          </Link>
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{supplier.name}</h3>
            {supplier.phone && <span className="text-sm text-muted-foreground" dir="ltr">{supplier.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportSupplierReport(supplier.name, rows, totalDebit, totalCredit, finalBalance)}
          >
            <Download className="h-4 w-4" /><span className="hidden sm:inline">تصدير Excel</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />إضافة قيد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي المشتريات</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي المدفوع</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalCredit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">الرصيد</p>
          <p className={cn("text-xl font-bold", balanceClass)}>
            {formatCurrency(finalBalance)}
          </p>
          <Badge variant={finalBalance < 0 ? "destructive" : "default"} className="mt-1 text-[10px]">
            {balanceLabel}
          </Badge>
        </CardContent></Card>
      </div>

      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">{CUSTOMER_TX_HEADERS.rowNum}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.date}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.description}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.quantity}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.price}</TableHead>
              <TableHead className="text-start">عليه</TableHead>
              <TableHead className="text-start">له</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.balance}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.source}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((entry, index) => (
              <TableRow key={entry.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{formatDate(entry.entry_date)}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>{entry.quantity != null ? entry.quantity : ""}</TableCell>
                <TableCell>{entry.price != null ? formatCurrency(entry.price) : ""}</TableCell>
                <TableCell className={entry.debit > 0 ? "text-red-600 font-semibold" : ""}>
                  {entry.debit > 0 ? formatCurrency(entry.debit) : ""}
                </TableCell>
                <TableCell className={entry.credit > 0 ? "text-green-600 font-semibold" : ""}>
                  {entry.credit > 0 ? formatCurrency(entry.credit) : ""}
                </TableCell>
                <TableCell className={cn(
                  "font-bold",
                  entry.runningBalance < 0 ? "text-red-600" :
                    entry.runningBalance > 0 ? "text-green-600" : "",
                )}>
                  {formatCurrency(entry.runningBalance)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {entry.source_type === "bank" && entry.source_id ? bankNameMap[entry.source_id] ?? "" : ""}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  لا توجد حركات لهذا المورد
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={5}>الإجمالي</TableCell>
                <TableCell className="text-red-600">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-green-600">{formatCurrency(totalCredit)}</TableCell>
                <TableCell className={cn("font-bold", balanceClass)}>{formatCurrency(finalBalance)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {rows.length ? (
          <>
            {rows.map((entry, index) => {
              const bankName = entry.source_type === "bank" && entry.source_id
                ? bankNameMap[entry.source_id]
                : "";
              return (
                <div key={entry.id} className="rounded-lg border p-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>#{index + 1}</span>
                        <span>{formatDate(entry.entry_date)}</span>
                      </div>
                      <div className="font-semibold mt-0.5 break-words">{entry.description}</div>
                      {bankName && (
                        <Badge variant="outline" className="text-[10px] mt-1">{bankName}</Badge>
                      )}
                    </div>
                  </div>
                  {(entry.quantity != null || entry.price != null) && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs">
                      {entry.quantity != null && (
                        <div>
                          <span className="text-muted-foreground">{CUSTOMER_TX_HEADERS.quantity}: </span>
                          <span className="font-medium">{entry.quantity}</span>
                        </div>
                      )}
                      {entry.price != null && (
                        <div>
                          <span className="text-muted-foreground">{CUSTOMER_TX_HEADERS.price}: </span>
                          <span className="font-medium">{formatCurrency(entry.price)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div>
                      <div className="text-[10px] text-muted-foreground">عليه</div>
                      <div className={entry.debit > 0 ? "text-red-600 font-semibold" : ""}>
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">له</div>
                      <div className={entry.credit > 0 ? "text-green-600 font-semibold" : ""}>
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">{CUSTOMER_TX_HEADERS.balance}</div>
                      <div className={cn(
                        "font-bold",
                        entry.runningBalance < 0 ? "text-red-600" :
                          entry.runningBalance > 0 ? "text-green-600" : "",
                      )}>
                        {formatCurrency(entry.runningBalance)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <div className="font-bold text-sm">الإجمالي</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground">عليه</div>
                  <div className="font-bold text-red-600">{formatCurrency(totalDebit)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">له</div>
                  <div className="font-bold text-green-600">{formatCurrency(totalCredit)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">الرصيد</div>
                  <div className={cn("font-bold", balanceClass)}>{formatCurrency(finalBalance)}</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
            لا توجد حركات لهذا المورد
          </div>
        )}
      </div>

      <AddSupplierTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        supplierId={supplier.id}
        userId={userId}
        banks={bankData}
        supplierName={supplier.name}
      />
    </div>
  );
}
