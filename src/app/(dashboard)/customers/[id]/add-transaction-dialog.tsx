"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { safeInsert } from "@/lib/supabase/safe-fetch";
import { MESSAGES } from "@/lib/constants";
import { formatCurrency, todayISO } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CustomerBankSelect } from "@/components/shared/customer-bank-select";
import { useCustomerBankAccounts } from "@/hooks/use-customer-bank-accounts";
import type { Bank } from "@/types/database";

const CASH_SOURCES = [
  { id: "cash_office", name: "تحصيل نقدي المكتب" },
  { id: "cash_warehouse", name: "تحصيل نقدي المخزن" },
];

const schema = z.object({
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  type: z.enum(["debit", "credit", "manual"]),
  description: z.string().optional(),
  quantity: z.string().optional(),
  price: z.string().optional(),
  amount: z.string().optional(),
  payment_source: z.string().optional(),
  customer_bank_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddCustomerTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  userId: string;
  banks: Bank[];
  customerName: string;
}

export function AddCustomerTransactionDialog({ open, onOpenChange, customerId, userId, banks, customerName }: AddCustomerTransactionDialogProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { entry_date: todayISO(), type: "debit", description: "", quantity: "", price: "", amount: "", payment_source: "", customer_bank_id: "" },
  });

  const txType = form.watch("type");
  const quantity = Number(form.watch("quantity")) || 0;
  const price = Number(form.watch("price")) || 0;
  const calculatedAmount = quantity * price;

  const { data: customerBanks = [] } = useCustomerBankAccounts(customerId);

  // Reset fields when switching type
  useEffect(() => {
    form.setValue("quantity", "");
    form.setValue("price", "");
    form.setValue("amount", "");
    form.setValue("payment_source", "");
    form.setValue("customer_bank_id", "");
    form.setValue("description", "");
  }, [txType, form]);

  async function onSubmit(values: FormValues) {
    let debit = 0;
    let credit = 0;
    let qty: number | null = null;
    let prc: number | null = null;
    let description = values.description || "";

    if (values.type === "debit") {
      // Sales: qty × price → debit
      qty = Number(values.quantity) || 0;
      prc = Number(values.price) || 0;
      debit = qty * prc;
      if (debit <= 0) { toast.error("يجب إدخال كمية وسعر صحيحين"); return; }
      if (!description) { toast.error("التفاصيل مطلوبة"); return; }
    } else if (values.type === "credit") {
      // Payment: amount + source
      credit = Number(values.amount) || 0;
      if (credit <= 0) { toast.error("يجب إدخال مبلغ الدفع"); return; }
      if (!values.payment_source) { toast.error("يرجى اختيار مصدر الدفع"); return; }
      // Auto-set description from source name
      const cashSource = CASH_SOURCES.find((s) => s.id === values.payment_source);
      const bankSource = banks.find((b) => b.id === values.payment_source);
      description = cashSource?.name || bankSource?.name || "";
    } else {
      // Manual adjustment
      debit = Number(values.amount) || 0;
      if (debit < 0) { debit = 0; credit = Math.abs(Number(values.amount) || 0); }
      if (debit === 0 && credit === 0) { toast.error("يجب إدخال مبلغ التعديل"); return; }
      if (!description) { toast.error("التفاصيل مطلوبة"); return; }
    }

    const isBankSource = values.payment_source && !CASH_SOURCES.some((s) => s.id === values.payment_source);

    const { error } = await safeInsert("customer_transactions", {
      customer_id: customerId,
      entry_date: values.entry_date,
      description,
      quantity: qty,
      price: prc,
      debit, credit,
      source_type: isBankSource ? "bank" : values.type === "credit" ? "cash" : "manual",
      source_id: isBankSource ? values.payment_source! : null,
      bank_id: isBankSource ? values.payment_source! : null,
      customer_bank_id: values.customer_bank_id || null,
      created_by: userId,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    // If payment via bank, also create bank transaction
    if (credit > 0 && isBankSource) {
      const { error: bankError } = await safeInsert("bank_transactions", {
        bank_id: values.payment_source!,
        entry_date: values.entry_date,
        description: customerName,
        debit: credit,
        credit: 0,
        created_by: userId,
      });

      if (bankError) {
        toast.error("تم حفظ قيد العميل لكن فشل تسجيل العملية البنكية");
        return;
      }
    }

    toast.success(MESSAGES.customerTransactionAdded);
    form.reset({ entry_date: todayISO(), type: "debit", description: "", quantity: "", price: "", amount: "", payment_source: "", customer_bank_id: "" });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>إضافة قيد جديد</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="entry_date" render={({ field }) => (
              <FormItem><FormLabel>التاريخ</FormLabel><FormControl><Input type="date" {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>نوع القيد</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="debit">عليه (مبيعات)</SelectItem>
                    <SelectItem value="credit">له (دفع / تحصيل)</SelectItem>
                    <SelectItem value="manual">تعديل يدوي (خصم / تعديل)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* === DEBIT (Sales) === */}
            {txType === "debit" && (
              <>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>التفاصيل</FormLabel><FormControl><Input {...field} placeholder="مثال: عادة مصريين" /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>العدد / الكمية</FormLabel><FormControl><Input type="number" step="0.001" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>السعر</FormLabel><FormControl><Input type="number" step="0.01" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                {calculatedAmount > 0 && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3 text-center">
                    <span className="text-sm text-muted-foreground">عليه (تلقائي): </span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(calculatedAmount)}</span>
                  </div>
                )}
              </>
            )}

            {/* === CREDIT (Payment) === */}
            {txType === "credit" && (
              <>
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>المبلغ</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="payment_source" render={({ field }) => (
                  <FormItem>
                    <FormLabel>إلى (وجهة الدفع) <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="اختر مصدر الدفع" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CASH_SOURCES.map((src) => (
                          <SelectItem key={src.id} value={src.id}>{src.name}</SelectItem>
                        ))}
                        {banks.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">بنوك / محافظ / إنستاباي</div>
                            {banks.map((bank) => (
                              <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                {customerBanks.length > 0 && (
                  <FormField control={form.control} name="customer_bank_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>من حساب العميل (اختياري)</FormLabel>
                      <FormControl>
                        <CustomerBankSelect
                          accounts={customerBanks}
                          value={field.value ?? ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </>
            )}

            {/* === MANUAL ADJUSTMENT === */}
            {txType === "manual" && (
              <>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>التفاصيل</FormLabel><FormControl><Input {...field} placeholder="مثال: خصم اتفاق" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>المبلغ (موجب = عليه، سالب = له)</FormLabel><FormControl><Input type="number" step="0.01" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
                )} />
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "جاري الحفظ..." : "حفظ"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
