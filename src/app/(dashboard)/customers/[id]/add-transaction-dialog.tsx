"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
import type { Bank } from "@/types/database";

const schema = z.object({
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  type: z.enum(["debit", "credit"]),
  description: z.string().min(1, "التفاصيل مطلوبة"),
  quantity: z.string().optional(),
  price: z.string().optional(),
  amount: z.string().optional(),
  bank_id: z.string().optional(),
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
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { entry_date: todayISO(), type: "debit", description: "", quantity: "", price: "", amount: "", bank_id: "" },
  });

  const txType = form.watch("type");
  const quantity = Number(form.watch("quantity")) || 0;
  const price = Number(form.watch("price")) || 0;
  const calculatedAmount = quantity * price;

  // Clear bank when switching to debit
  useEffect(() => {
    if (txType === "debit") {
      form.setValue("bank_id", "");
      form.setValue("amount", "");
    }
    if (txType === "credit") {
      form.setValue("quantity", "");
      form.setValue("price", "");
    }
  }, [txType, form]);

  async function onSubmit(values: FormValues) {
    let debit = 0;
    let credit = 0;
    let qty: number | null = null;
    let prc: number | null = null;

    if (values.type === "debit") {
      qty = Number(values.quantity) || 0;
      prc = Number(values.price) || 0;
      debit = qty * prc;
      if (debit <= 0) { toast.error("يجب إدخال كمية وسعر صحيحين"); return; }
    } else {
      credit = Number(values.amount) || 0;
      if (credit <= 0) { toast.error("يجب إدخال مبلغ الدفع"); return; }
      if (!values.bank_id) { toast.error("يرجى اختيار مصدر الدفع (البنك)"); return; }
    }

    const { error } = await supabase.from("customer_transactions").insert({
      customer_id: customerId,
      entry_date: values.entry_date,
      description: values.description,
      quantity: qty,
      price: prc,
      debit, credit,
      source_type: values.bank_id ? "bank" : "manual",
      source_id: values.bank_id || null,
      created_by: userId,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    // If payment via bank, also create bank transaction
    if (credit > 0 && values.bank_id) {
      const { error: bankError } = await supabase.from("bank_transactions").insert({
        bank_id: values.bank_id,
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
    form.reset({ entry_date: todayISO(), type: "debit", description: "", quantity: "", price: "", amount: "", bank_id: "" });
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="debit">عليه (مبيعات)</SelectItem>
                    <SelectItem value="credit">له (دفع / تحصيل)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>التفاصيل</FormLabel><FormControl><Input {...field} placeholder={txType === "debit" ? "مثال: عادة مصريين" : "مثال: بنك ابوظبي"} /></FormControl><FormMessage /></FormItem>
            )} />

            {txType === "debit" ? (
              <>
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
            ) : (
              <>
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>المبلغ</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="bank_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>مصدر الدفع (البنك) <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر البنك أو المحفظة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>
                            {bank.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
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
