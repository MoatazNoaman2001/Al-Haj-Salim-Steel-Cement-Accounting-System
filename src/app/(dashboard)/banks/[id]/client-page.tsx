"use client";

import { useMemo, useState } from "react";
import { Plus, Printer, ArrowRight } from "lucide-react";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BANK_TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRealtimeBankTransactions } from "@/hooks/use-realtime";
import { AddBankTransactionDialog } from "./add-transaction-dialog";
import type { Bank, BankTransactionWithCreator } from "@/types/database";

interface BankDetailClientProps {
  bank: Bank;
  transactions: BankTransactionWithCreator[];
}

export function BankDetailClient({ bank, transactions }: BankDetailClientProps) {
  const { userId } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useRealtimeBankTransactions(bank.id);

  const { rows, totalDebit, totalCredit, currentBalance } = useMemo(() => {
    let runningBalance = bank.balance;
    const activeEntries = transactions.filter((e) => !e.is_corrected);
    const computedRows = activeEntries.map((entry) => {
      runningBalance += entry.credit - entry.debit;
      return { ...entry, runningBalance };
    });
    const totalDebit = activeEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = activeEntries.reduce((sum, e) => sum + e.credit, 0);
    return { rows: computedRows, totalDebit, totalCredit, currentBalance: bank.balance + totalCredit - totalDebit };
  }, [bank.balance, transactions]);

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Link href="/banks">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowRight className="h-4 w-4" />البنوك</Button>
          </Link>
          <h3 className="text-lg font-bold">{bank.name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />طباعة
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />إضافة عملية
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">الرصيد الافتتاحي</p>
          <p className="text-xl font-bold">{formatCurrency(bank.balance)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي مدين (سحب)</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(currentBalance)}</p>
        </CardContent></Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">{BANK_TABLE_HEADERS.rowNum}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.date}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.description}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.debit}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.credit}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.balance}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.createdBy}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((entry, index) => (
              <TableRow key={entry.id} className={cn(entry.is_corrected && "opacity-50 line-through", entry.correction_of_id && "bg-green-50")}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{formatDate(entry.entry_date)}</TableCell>
                <TableCell>{entry.description}</TableCell>
                <TableCell className={entry.debit > 0 ? "text-red-600 font-semibold" : ""}>{entry.debit > 0 ? formatCurrency(entry.debit) : "—"}</TableCell>
                <TableCell className={entry.credit > 0 ? "text-green-600 font-semibold" : ""}>{entry.credit > 0 ? formatCurrency(entry.credit) : "—"}</TableCell>
                <TableCell className="font-bold">{formatCurrency(entry.runningBalance)}</TableCell>
                <TableCell>{entry.creator?.full_name ?? "—"}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">لا توجد عمليات لهذا البنك</TableCell></TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3}>الإجمالي</TableCell>
                <TableCell className="text-red-600">{formatCurrency(totalDebit)}</TableCell>
                <TableCell className="text-green-600">{formatCurrency(totalCredit)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(currentBalance)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddBankTransactionDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} bankId={bank.id} userId={userId} />
    </div>
  );
}
