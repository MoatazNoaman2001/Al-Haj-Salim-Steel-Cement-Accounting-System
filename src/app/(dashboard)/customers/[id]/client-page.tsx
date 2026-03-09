"use client";

import { useMemo, useState } from "react";
import { Plus, Printer, ArrowRight } from "lucide-react";
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
import { useRealtimeCustomerTransactions } from "@/hooks/use-realtime";
import { AddCustomerTransactionDialog } from "./add-transaction-dialog";
import type { Customer, CustomerTransactionWithCreator } from "@/types/database";

interface CustomerDetailClientProps {
  customer: Customer;
  transactions: CustomerTransactionWithCreator[];
}

export function CustomerDetailClient({ customer, transactions }: CustomerDetailClientProps) {
  const { userId } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useRealtimeCustomerTransactions(customer.id);

  const { rows, totalDebit, totalCredit, finalBalance } = useMemo(() => {
    let runningBalance = 0;
    const activeEntries = transactions.filter((e) => !e.is_corrected);
    const computedRows = activeEntries.map((entry) => {
      runningBalance += entry.debit - entry.credit;
      return { ...entry, runningBalance };
    });
    const totalDebit = activeEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = activeEntries.reduce((sum, e) => sum + e.credit, 0);
    return { rows: computedRows, totalDebit, totalCredit, finalBalance: totalDebit - totalCredit };
  }, [transactions]);

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Link href="/customers">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowRight className="h-4 w-4" />العملاء</Button>
          </Link>
          <div>
            <h3 className="text-lg font-bold">{customer.name}</h3>
            {customer.phone && <span className="text-sm text-muted-foreground" dir="ltr">{customer.phone}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />طباعة
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />إضافة قيد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي عليه</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي له</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalCredit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">الرصيد</p>
          <p className={cn("text-xl font-bold", finalBalance > 0 ? "text-red-600" : finalBalance < 0 ? "text-green-600" : "")}>
            {formatCurrency(finalBalance)}
          </p>
          <Badge variant={finalBalance > 0 ? "destructive" : "default"} className="mt-1 text-[10px]">
            {finalBalance > 0 ? "مدين" : finalBalance < 0 ? "دائن" : "متزن"}
          </Badge>
        </CardContent></Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">{CUSTOMER_TX_HEADERS.rowNum}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.date}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.description}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.quantity}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.price}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.debit}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.credit}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.balance}</TableHead>
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.createdBy}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((entry, index) => (
              <TableRow key={entry.id} className={cn(entry.is_corrected && "opacity-50 line-through", entry.correction_of_id && "bg-green-50")}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{formatDate(entry.entry_date)}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell>{entry.quantity != null ? entry.quantity : "—"}</TableCell>
                <TableCell>{entry.price != null ? formatCurrency(entry.price) : "—"}</TableCell>
                <TableCell className={entry.debit > 0 ? "text-red-600 font-semibold" : ""}>{entry.debit > 0 ? formatCurrency(entry.debit) : "—"}</TableCell>
                <TableCell className={entry.credit > 0 ? "text-green-600 font-semibold" : ""}>{entry.credit > 0 ? formatCurrency(entry.credit) : "—"}</TableCell>
                <TableCell className={cn("font-bold", entry.runningBalance > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(entry.runningBalance)}</TableCell>
                <TableCell>{entry.creator?.full_name ?? "—"}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground">لا توجد حركات لهذا العميل</TableCell></TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={5}>الإجمالي</TableCell>
                <TableCell className="text-red-600">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-green-600">{formatCurrency(totalCredit)}</TableCell>
                <TableCell className={cn("font-bold", finalBalance > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(finalBalance)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddCustomerTransactionDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} customerId={customer.id} userId={userId} />
    </div>
  );
}
