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
import { CUSTOMER_TX_HEADERS, MESSAGES } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRealtimeCustomerTransactions } from "@/hooks/use-realtime";
import { AddCustomerTransactionDialog } from "./add-transaction-dialog";
import { CustomerCorrectionDialog } from "./correction-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Customer, CustomerTransactionWithCreator, Bank } from "@/types/database";

interface CustomerDetailClientProps {
  customer: Customer;
  transactions: CustomerTransactionWithCreator[];
  banks: Bank[];
}

export function CustomerDetailClient({ customer, transactions, banks }: CustomerDetailClientProps) {
  const { userId, isAdmin } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [correctionEntry, setCorrectionEntry] = useState<CustomerTransactionWithCreator | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<CustomerTransactionWithCreator | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useRealtimeCustomerTransactions(customer.id);

  // Build bank name lookup
  const bankNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    banks.forEach((b) => { map[b.id] = b.name; });
    return map;
  }, [banks]);

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

  async function handleDelete() {
    if (!deleteEntry) return;
    setDeleting(true);

    const { error } = await supabase
      .from("customer_transactions")
      .update({ is_corrected: true })
      .eq("id", deleteEntry.id);

    if (error) { toast.error(MESSAGES.error); setDeleting(false); return; }

    toast.success("تم حذف القيد بنجاح");
    setDeleteEntry(null);
    setDeleting(false);
    router.refresh();
  }

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
              <TableHead className="text-start">{CUSTOMER_TX_HEADERS.source}</TableHead>
              {isAdmin && <TableHead className="text-start w-[100px]">إجراءات</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
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
                  <TableCell>{entry.quantity != null ? entry.quantity : ""}</TableCell>
                  <TableCell>{entry.price != null ? formatCurrency(entry.price) : ""}</TableCell>
                  <TableCell className={entry.debit > 0 ? "text-red-600 font-semibold" : ""}>{entry.debit > 0 ? formatCurrency(entry.debit) : ""}</TableCell>
                  <TableCell className={entry.credit > 0 ? "text-green-600 font-semibold" : ""}>{entry.credit > 0 ? formatCurrency(entry.credit) : ""}</TableCell>
                  <TableCell className={cn("font-bold", entry.runningBalance > 0 ? "text-red-600" : "text-green-600")}>{formatCurrency(entry.runningBalance)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {entry.source_type === "bank" && entry.source_id ? bankNameMap[entry.source_id] ?? "" : ""}
                  </TableCell>
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
              <TableRow><TableCell colSpan={isAdmin ? 11 : 10} className="h-24 text-center text-muted-foreground">لا توجد حركات لهذا العميل</TableCell></TableRow>
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
                {isAdmin && <TableCell />}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddCustomerTransactionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        customerId={customer.id}
        userId={userId}
        banks={banks}
        customerName={customer.name}
      />
      <CustomerCorrectionDialog
        entry={correctionEntry}
        onClose={() => setCorrectionEntry(null)}
        userId={userId}
        banks={banks}
        customerName={customer.name}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم شطب هذا القيد ({deleteEntry?.description}). القيد الأصلي سيبقى مرئي بخط يتوسطه شطب.
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
