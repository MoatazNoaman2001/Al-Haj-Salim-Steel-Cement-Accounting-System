"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowRight, Pencil, Trash2, Download } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BANK_TABLE_HEADERS, MESSAGES } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useBank, useBankTransactions } from "@/hooks/use-banks-queries";
import { safeUpdate } from "@/lib/supabase/safe-fetch";
import { AddBankTransactionDialog } from "./add-transaction-dialog";
import { BankCorrectionDialog } from "./correction-dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { exportBankReport } from "@/lib/export-excel";
import { DevMockBanner } from "@/components/dev-mock-banner";
import { IS_DEV_MOCK_ENABLED, isMockId, mockBankTransactions } from "@/lib/dev-mocks";
import type { Bank, BankTransactionWithCreator, ActionRequestWithRelations } from "@/types/database";

interface BankDetailClientProps {
  bankId: string;
  bank: Bank | null;
  transactions: BankTransactionWithCreator[];
  editHistory: ActionRequestWithRelations[];
}

const ACTION_LABELS: Record<string, string> = {
  edit: "تعديل",
  delete: "حذف",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
};

const FIELD_LABELS: Record<string, string> = {
  name: "الاسم",
  balance: "الرصيد الافتتاحي",
};

export function BankDetailClient({ bankId, bank: serverBank, transactions, editHistory }: BankDetailClientProps) {
  const { userId, isAdmin } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [correctionEntry, setCorrectionEntry] = useState<BankTransactionWithCreator | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<BankTransactionWithCreator | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { data: bank } = useBank(bankId, serverBank);
  const { data: realTxData } = useBankTransactions(bankId, transactions);

  const txData = useMemo(() => {
    if (realTxData.length > 0) return realTxData;
    if (!IS_DEV_MOCK_ENABLED) return realTxData;
    return mockBankTransactions(bankId, userId);
  }, [realTxData, bankId, userId]);
  const isUsingMock = txData !== realTxData && txData.length > 0;

  if (!bank) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground">جاري التحميل من الذاكرة المحلية...</div>;
  }

  const { rows, totalDebit, totalCredit, currentBalance } = useMemo(() => {
    let runningBalance = bank.balance;
    const activeEntries = txData.filter((e) => !e.is_corrected);
    const computedRows = activeEntries.map((entry) => {
      runningBalance += entry.credit - entry.debit;
      return { ...entry, runningBalance };
    });
    const totalDebit = activeEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = activeEntries.reduce((sum, e) => sum + e.credit, 0);
    return { rows: computedRows, totalDebit, totalCredit, currentBalance: bank.balance + totalCredit - totalDebit };
  }, [bank.balance, txData]);

  async function handleDelete() {
    if (!deleteEntry) return;
    setDeleting(true);

    const { error: updateError } = await safeUpdate("bank_transactions", { is_corrected: true }, { id: deleteEntry.id });

    if (updateError) { toast.error(MESSAGES.error); setDeleting(false); return; }

    toast.success("تم حذف العملية بنجاح");
    setDeleteEntry(null);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div>
      {isUsingMock && <DevMockBanner label="حركات بنك تجريبية" />}
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/banks">
            <Button variant="ghost" size="sm" className="gap-1 shrink-0"><ArrowRight className="h-4 w-4" />رجوع</Button>
          </Link>
          <h3 className="text-lg font-bold truncate">{bank.name}</h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportBankReport(bank.name, bank.balance, rows, totalDebit, totalCredit, currentBalance)}
          >
            <Download className="h-4 w-4" /><span className="hidden sm:inline">تصدير Excel</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />إضافة عملية
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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

      <div className="hidden md:block rounded-md border overflow-x-auto">
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

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {rows.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
            <span className="font-medium text-sm">رصيد افتتاحي</span>
            <span className="font-bold text-green-600">
              {formatCurrency(bank.balance)}
            </span>
          </div>
        )}
        {rows.length ? (
          <>
            {rows.map((entry, index) => {
              const isCorrected = entry.is_corrected;
              const isCorrection = !!entry.correction_of_id;
              const canAction = !isCorrected && !isCorrection;
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "rounded-lg border p-3 space-y-2 text-sm",
                    isCorrected && "opacity-50 line-through bg-red-50",
                    isCorrection && "bg-green-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>#{index + 1}</span>
                        <span>{formatDate(entry.entry_date)}</span>
                      </div>
                      <div className="font-semibold mt-0.5 break-words">
                        {entry.description}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {isCorrected && (
                          <Badge variant="destructive" className="text-[10px]">
                            تم التصحيح
                          </Badge>
                        )}
                        {isCorrection && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-green-100 text-green-800"
                          >
                            تصحيح
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isAdmin && canAction && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isMockId(entry.id)}
                          onClick={() =>
                            !isMockId(entry.id) && setCorrectionEntry(entry)
                          }
                          title="تصحيح"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={isMockId(entry.id)}
                          onClick={() =>
                            !isMockId(entry.id) && setDeleteEntry(entry)
                          }
                          title="حذف"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        {BANK_TABLE_HEADERS.debit}
                      </div>
                      <div
                        className={
                          entry.debit > 0 ? "text-red-600 font-semibold" : ""
                        }
                      >
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        {BANK_TABLE_HEADERS.credit}
                      </div>
                      <div
                        className={
                          entry.credit > 0 ? "text-green-600 font-semibold" : ""
                        }
                      >
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        {BANK_TABLE_HEADERS.balance}
                      </div>
                      <div className="font-bold">
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
                  <div className="text-[10px] text-muted-foreground">
                    {BANK_TABLE_HEADERS.debit}
                  </div>
                  <div className="font-bold text-red-600">
                    {formatCurrency(totalDebit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {BANK_TABLE_HEADERS.credit}
                  </div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(totalCredit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {BANK_TABLE_HEADERS.balance}
                  </div>
                  <div className="font-bold">
                    {formatCurrency(currentBalance)}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
            لا توجد عمليات لهذا البنك
          </div>
        )}
      </div>

      {/* Edit History Section */}
      {editHistory.length > 0 && (
        <div className="mt-6">
          <Separator className="mb-4" />
          <h3 className="text-lg font-bold mb-3">سجل التعديلات</h3>
          <div className="hidden md:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">التاريخ</TableHead>
                  <TableHead className="text-start">الإجراء</TableHead>
                  <TableHead className="text-start">التغييرات</TableHead>
                  <TableHead className="text-start">السبب</TableHead>
                  <TableHead className="text-start">طلب بواسطة</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                  <TableHead className="text-start">راجع بواسطة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editHistory.map((req) => {
                  const changes = req.proposed_changes as Record<string, unknown> | null;
                  return (
                    <TableRow key={req.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(req.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={req.action === "delete" ? "destructive" : "outline"}>
                          {ACTION_LABELS[req.action]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.action === "edit" && changes ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(changes).map(([field, value]) => (
                              <Badge key={field} variant="secondary" className="text-xs">
                                {FIELD_LABELS[field] ?? field}: {typeof value === "number" ? formatCurrency(value) : String(value)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-destructive text-sm">حذف كامل</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{req.reason}</TableCell>
                      <TableCell>{req.requester?.full_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[req.status]}>
                          {STATUS_LABELS[req.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {req.reviewer?.full_name ?? "—"}
                        {req.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">{req.rejection_reason}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card view for edit history */}
          <div className="md:hidden space-y-3">
            {editHistory.map((req) => {
              const changes = req.proposed_changes as Record<string, unknown> | null;
              return (
                <div key={req.id} className="rounded-lg border p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(req.created_at)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={req.action === "delete" ? "destructive" : "outline"}
                        className="text-[10px]"
                      >
                        {ACTION_LABELS[req.action]}
                      </Badge>
                      <Badge variant={STATUS_VARIANT[req.status]} className="text-[10px]">
                        {STATUS_LABELS[req.status]}
                      </Badge>
                    </div>
                  </div>
                  {req.action === "edit" && changes ? (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(changes).map(([field, value]) => (
                        <Badge key={field} variant="secondary" className="text-[10px]">
                          {FIELD_LABELS[field] ?? field}:{" "}
                          {typeof value === "number" ? formatCurrency(value) : String(value)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-destructive text-xs">حذف كامل</div>
                  )}
                  <div className="text-xs">{req.reason}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between pt-2 border-t">
                    <span>طلب: {req.requester?.full_name ?? "—"}</span>
                    <span>راجع: {req.reviewer?.full_name ?? "—"}</span>
                  </div>
                  {req.rejection_reason && (
                    <p className="text-xs text-destructive">{req.rejection_reason}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
