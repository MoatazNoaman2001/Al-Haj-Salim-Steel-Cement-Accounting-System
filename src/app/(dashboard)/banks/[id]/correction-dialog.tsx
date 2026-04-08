"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { safeInsert, safeUpdate } from "@/lib/supabase/safe-fetch";
import { MESSAGES } from "@/lib/constants";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { BankTransactionWithCreator } from "@/types/database";

const schema = z.object({
  reason: z.string().min(10, "سبب التصحيح يجب أن يكون 10 أحرف على الأقل"),
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  description: z.string().min(1, "الاسم مطلوب"),
  debit: z.string(),
  credit: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface BankCorrectionDialogProps {
  entry: BankTransactionWithCreator | null;
  onClose: () => void;
  userId: string;
}

export function BankCorrectionDialog({ entry, onClose, userId }: BankCorrectionDialogProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: entry ? {
      reason: "",
      entry_date: entry.entry_date,
      description: entry.description,
      debit: String(entry.debit),
      credit: String(entry.credit),
    } : undefined,
  });

  async function onSubmit(values: FormValues) {
    if (!entry) return;

    const newDebit = Number(values.debit) || 0;
    const newCredit = Number(values.credit) || 0;

    if (newDebit === 0 && newCredit === 0) {
      toast.error("يجب إدخال قيمة في مدين أو دائن");
      return;
    }

    // Check if anything changed
    const hasChanges =
      values.entry_date !== entry.entry_date ||
      values.description !== entry.description ||
      newDebit !== entry.debit ||
      newCredit !== entry.credit;

    if (!hasChanges) {
      toast.error("لم يتم تغيير أي قيمة");
      return;
    }

    const { error: updateError } = await safeUpdate("bank_transactions", { is_corrected: true }, { id: entry.id });
    if (updateError) { toast.error(MESSAGES.error); return; }

    const { error: insertError } = await safeInsert("bank_transactions", {
      bank_id: entry.bank_id,
      entry_date: values.entry_date,
      description: values.description,
      debit: newDebit,
      credit: newCredit,
      correction_of_id: entry.id,
      correction_reason: values.reason,
      created_by: userId,
    });
    if (insertError) { toast.error(MESSAGES.error); return; }

    toast.success("تم التصحيح بنجاح");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>تصحيح عملية بنكية</DialogTitle></DialogHeader>
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
                <FormItem><FormLabel>الاسم</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="debit" render={({ field }) => (
                  <FormItem><FormLabel>مدين</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="credit" render={({ field }) => (
                  <FormItem><FormLabel>دائن</FormLabel><FormControl><Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
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
