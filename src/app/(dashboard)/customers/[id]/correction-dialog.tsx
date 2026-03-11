"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES } from "@/lib/constants";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { CustomerTransactionWithCreator, Bank } from "@/types/database";

const schema = z.object({
  reason: z.string().min(10, "سبب التصحيح يجب أن يكون 10 أحرف على الأقل"),
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  description: z.string().min(1, "التفاصيل مطلوبة"),
  quantity: z.string().optional(),
  price: z.string().optional(),
  debit: z.string(),
  credit: z.string(),
  bank_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CustomerCorrectionDialogProps {
  entry: CustomerTransactionWithCreator | null;
  onClose: () => void;
  userId: string;
  banks: Bank[];
  customerName: string;
}

export function CustomerCorrectionDialog({ entry, onClose, userId, banks, customerName }: CustomerCorrectionDialogProps) {
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: entry ? {
      reason: "",
      entry_date: entry.entry_date,
      description: entry.description,
      quantity: entry.quantity != null ? String(entry.quantity) : "",
      price: entry.price != null ? String(entry.price) : "",
      debit: String(entry.debit),
      credit: String(entry.credit),
      bank_id: (entry.source_type === "bank" && entry.source_id) ? entry.source_id : "",
    } : undefined,
  });

  const creditValue = Number(form.watch("credit")) || 0;

  async function onSubmit(values: FormValues) {
    if (!entry) return;

    const newDebit = Number(values.debit) || 0;
    const newCredit = Number(values.credit) || 0;

    if (newDebit === 0 && newCredit === 0) {
      toast.error("يجب إدخال قيمة في عليه أو له");
      return;
    }

    if (newCredit > 0 && !values.bank_id) {
      toast.error("يرجى اختيار مصدر الدفع (البنك)");
      return;
    }

    // Check if anything changed
    const hasChanges =
      values.entry_date !== entry.entry_date ||
      values.description !== entry.description ||
      (Number(values.quantity) || null) !== entry.quantity ||
      (Number(values.price) || null) !== entry.price ||
      newDebit !== entry.debit ||
      newCredit !== entry.credit ||
      (values.bank_id || null) !== entry.source_id;

    if (!hasChanges) {
      toast.error("لم يتم تغيير أي قيمة");
      return;
    }

    // Mark original as corrected
    const { error: updateError } = await supabase
      .from("customer_transactions")
      .update({ is_corrected: true })
      .eq("id", entry.id);

    if (updateError) { toast.error(MESSAGES.error); return; }

    // Create new corrected entry
    const { error: insertError } = await supabase.from("customer_transactions").insert({
      customer_id: entry.customer_id,
      entry_date: values.entry_date,
      description: values.description,
      quantity: values.quantity ? Number(values.quantity) : null,
      price: values.price ? Number(values.price) : null,
      debit: newDebit,
      credit: newCredit,
      source_type: values.bank_id ? "bank" : "manual",
      source_id: values.bank_id || null,
      correction_of_id: entry.id,
      correction_reason: values.reason,
      created_by: userId,
    });

    if (insertError) { toast.error(MESSAGES.error); return; }

    // If credit with bank, also create corresponding bank transaction
    if (newCredit > 0 && values.bank_id) {
      await supabase.from("bank_transactions").insert({
        bank_id: values.bank_id,
        entry_date: values.entry_date,
        description: customerName,
        debit: newCredit,
        credit: 0,
        created_by: userId,
      });
    }

    toast.success("تم التصحيح بنجاح");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>تصحيح قيد عميل</DialogTitle></DialogHeader>
        {entry && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel>سبب التصحيح <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Textarea placeholder="اكتب سبب التصحيح (10 أحرف على الأقل)..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="entry_date" render={({ field }) => (
                <FormItem><FormLabel>التاريخ</FormLabel><FormControl><Input type="date" {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>التفاصيل</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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

              {creditValue > 0 && (
                <FormField control={form.control} name="bank_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>مصدر الدفع (البنك) <span className="text-destructive">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="اختر البنك أو المحفظة" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {banks.map((bank) => (
                          <SelectItem key={bank.id} value={bank.id}>{bank.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "جاري التصحيح..." : "تأكيد التصحيح"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
