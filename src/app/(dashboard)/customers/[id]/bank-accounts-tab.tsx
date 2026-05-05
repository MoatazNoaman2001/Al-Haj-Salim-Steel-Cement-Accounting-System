"use client";

import { useState } from "react";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCustomerBankAccounts,
  useAddCustomerBankAccount,
  useDeleteCustomerBankAccount,
} from "@/hooks/use-customer-bank-accounts";

interface BankAccountsTabProps {
  customerId: string;
}

export function BankAccountsTab({ customerId }: BankAccountsTabProps) {
  const { data: accounts = [], isLoading } = useCustomerBankAccounts(customerId);
  const addAccount = useAddCustomerBankAccount();
  const deleteAccount = useDeleteCustomerBankAccount();

  const [showForm, setShowForm] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function handleAdd() {
    if (!bankName.trim()) {
      toast.error("اسم البنك مطلوب");
      return;
    }
    addAccount.mutate(
      { customer_id: customerId, bank_name: bankName.trim(), account_number: accountNumber.trim() || null },
      {
        onSuccess: () => {
          setBankName("");
          setAccountNumber("");
          setShowForm(false);
          toast.success("تم إضافة الحساب البنكي");
        },
        onError: () => toast.error("حدث خطأ أثناء الإضافة"),
      },
    );
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    deleteAccount.mutate(
      { id: pendingDelete, customer_id: customerId },
      {
        onSuccess: () => {
          setPendingDelete(null);
          toast.success("تم حذف الحساب البنكي");
        },
        onError: () => toast.error("حدث خطأ أثناء الحذف"),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-muted-foreground">
          الحسابات المسجلة ({accounts.length})
        </h4>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          إضافة حساب
        </Button>
      </div>

      {/* Inline Add Form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>اسم البنك *</Label>
              <Input
                placeholder="مثال: بنك الأهلي"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>رقم الحساب (اختياري)</Label>
              <Input
                placeholder="IBAN أو رقم الحساب"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowForm(false); setBankName(""); setAccountNumber(""); }}
            >
              إلغاء
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={addAccount.isPending}>
              {addAccount.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-6">جاري التحميل...</div>
      ) : accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CreditCard className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">لا توجد حسابات بنكية مسجلة لهذا العميل</p>
          <p className="text-xs text-muted-foreground mt-1">أضف حسابًا لتتبع مصدر مدفوعاته</p>
        </div>
      ) : (
        <>
          <div className="hidden sm:block rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">اسم البنك</TableHead>
                  <TableHead className="text-start">رقم الحساب</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-medium">{acc.bank_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono" dir="ltr">
                      {acc.account_number ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(acc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{acc.bank_name}</div>
                  {acc.account_number && (
                    <div className="text-xs text-muted-foreground font-mono" dir="ltr">
                      {acc.account_number}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => setPendingDelete(acc.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إخفاء هذا الحساب البنكي من قائمة الاختيار. السجلات التاريخية لن تتأثر.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteAccount.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAccount.isPending ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
