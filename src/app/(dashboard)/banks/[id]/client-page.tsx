"use client";

import { useMemo, useState } from "react";
import { Plus, Printer, ArrowRight, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BANK_TABLE_HEADERS, MESSAGES } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRealtimeBankTransactions } from "@/hooks/use-realtime";
import { AddBankTransactionDialog } from "./add-transaction-dialog";
import { BankCorrectionDialog } from "./correction-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Bank, BankTransactionWithCreator } from "@/types/database";

interface BankDetailClientProps {
  bank: Bank;
  transactions: BankTransactionWithCreator[];
}

export function BankDetailClient({ bank, transactions }: BankDetailClientProps) {
  const { userId, isAdmin } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [correctionEntry, setCorrectionEntry] = useState<BankTransactionWithCreator | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<BankTransactionWithCreator | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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

  async function handleDelete() {
    if (!deleteEntry) return;
    setDeleting(true);

    // Mark original as corrected
    const { error: updateError } = await supabase
      .from("bank_transactions")
      .update({ is_corrected: true })
      .eq("id", deleteEntry.id);

    if (updateError) { toast.error(MESSAGES.error); setDeleting(false); return; }

    toast.success("تم حذف العملية بنجاح");
    setDeleteEntry(null);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Link href="/banks">
            <Button variant="ghost" size="sm" className="gap-1"><ArrowRight className="h-4 w-4" />الصفحة الرئيسية</Button>
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
          <p className="text-sm text-muted-foreground">إجمالي مدين</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي دائن</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalCredit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">{BANK_TABLE_HEADERS.balance}</p>
          <p className="text-xl font-bold">{formatCurrency(currentBalance)}</p>
        </CardContent></Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">{BANK_TABLE_HEADERS.rowNum}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.date}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.name}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.debit}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.credit}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.balance}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.createdBy}</TableHead>
              {isAdmin && <TableHead className="text-start w-[100px]">إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Opening balance row */}
            {rows.length > 0 && (
              <TableRow className="bg-muted/30">
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="font-medium">رصيد افتتاحي</TableCell>
                <TableCell></TableCell>
                <TableCell className="text-green-600 font-semibold">{formatCurrency(bank.balance)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(bank.balance)}</TableCell>
                <TableCell></TableCell>
                {isAdmin && <TableCell></TableCell>}
              </TableRow>
            )}
            {rows.length ? rows.map((entry, index) => {
              const isCorrected = entry.is_corrected;
              const isCorrection = !!entry.correction_of_id;
              const canAction = !isCorrected && !isCorrection;

              return (
                <TableRow
                  key={entry.id}
                  className={cn(
                    isCorrected && "opacity-50 line-through bg-red-50",
                    isCorrection && "bg-green-50",
                  )}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{formatDate(entry.entry_date)}</TableCell>
                  <TableCell>
                    {entry.description}
                    {isCorrected && <Badge variant="destructive" className="ms-2 text-[10px]">تم التصحيح</Badge>}
                    {isCorrection && <Badge variant="secondary" className="ms-2 text-[10px] bg-green-100 text-green-800">تصحيح</Badge>}
                  </TableCell>
                  <TableCell className={entry.debit > 0 ? "text-red-600 font-semibold" : ""}>{entry.debit > 0 ? formatCurrency(entry.debit) : ""}</TableCell>
                  <TableCell className={entry.credit > 0 ? "text-green-600 font-semibold" : ""}>{entry.credit > 0 ? formatCurrency(entry.credit) : ""}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(entry.runningBalance)}</TableCell>
                  <TableCell>{entry.creator?.full_name ?? "—"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      {canAction && (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCorrectionEntry(entry)} title="تصحيح">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteEntry(entry)} title="حذف">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="h-24 text-center text-muted-foreground">لا توجد عمليات لهذا البنك</TableCell></TableRow>
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
                {isAdmin && <TableCell />}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddBankTransactionDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} bankId={bank.id} userId={userId} />
      <BankCorrectionDialog entry={correctionEntry} onClose={() => setCorrectionEntry(null)} userId={userId} />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم شطب هذه العملية ({deleteEntry?.description}). العملية الأصلية ستبقى مرئية بخط يتوسطه شطب.
              <br />هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "جاري الحذف..." : "تأكيد الحذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
