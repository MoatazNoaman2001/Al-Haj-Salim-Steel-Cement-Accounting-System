"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES } from "@/lib/constants";
import { todayISO } from "@/lib/utils";
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
  description: z.string().min(1, "التفاصيل مطلوبة"),
  quantity: z.string().optional(),
  price: z.string().optional(),
  debit: z.string(),
  credit: z.string(),
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
    defaultValues: { entry_date: todayISO(), description: "", quantity: "", price: "", debit: "0", credit: "0", bank_id: "" },
  });

  const creditValue = Number(form.watch("credit")) || 0;

  // Clear bank selection when credit is 0
  useEffect(() => {
    if (creditValue === 0) {
      form.setValue("bank_id", "");
    }
  }, [creditValue, form]);

  async function onSubmit(values: FormValues) {
    const debit = Number(values.debit) || 0;
    const credit = Number(values.credit) || 0;

    if (debit === 0 && credit === 0) { toast.error("يجب إدخال قيمة في عليه أو له"); return; }

    // If credit > 0 and bank selected, require bank
    if (credit > 0 && !values.bank_id) {
      toast.error("يرجى اختيار مصدر الدفع (البنك)");
      return;
    }

    // Insert customer transaction
    const { error } = await supabase.from("customer_transactions").insert({
      customer_id: customerId,
      entry_date: values.entry_date,
      description: values.description,
      quantity: values.quantity ? Number(values.quantity) : null,
      price: values.price ? Number(values.price) : null,
      debit, credit,
      source_type: values.bank_id ? "bank" : "manual",
      source_id: values.bank_id || null,
      created_by: userId,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    // If payment via bank, also create bank transaction (debit = money going out of bank to customer)
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
    form.reset({ entry_date: todayISO(), description: "", quantity: "", price: "", debit: "0", credit: "0", bank_id: "" });
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
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>التفاصيل</FormLabel><FormControl><Input {...field} placeholder="مثال: تحصيل نقدي" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem><FormLabel>العدد</FormLabel><FormControl><Input type="number" step="0.001" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem><FormLabel>السعر</FormLabel><FormControl><Input type="number" step="0.01" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="debit" render={({ field }) => (
                <FormItem><FormLabel>عليه</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="credit" render={({ field }) => (
                <FormItem><FormLabel>له</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            {/* Bank selector — shown when credit > 0 */}
            {creditValue > 0 && (
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
