"use client";

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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  description: z.string().min(1, "الاسم مطلوب"),
  debit: z.string(),
  credit: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface AddBankTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankId: string;
  userId: string;
}

export function AddBankTransactionDialog({ open, onOpenChange, bankId, userId }: AddBankTransactionDialogProps) {
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { entry_date: todayISO(), description: "", debit: "0", credit: "0" },
  });

  async function onSubmit(values: FormValues) {
    const debit = Number(values.debit) || 0;
    const credit = Number(values.credit) || 0;

    if (debit === 0 && credit === 0) { toast.error("يجب إدخال قيمة في مدين أو دائن"); return; }

    const { error } = await supabase.from("bank_transactions").insert({
      bank_id: bankId, entry_date: values.entry_date, description: values.description,
      debit, credit, created_by: userId,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    toast.success(MESSAGES.bankTransactionAdded);
    form.reset({ entry_date: todayISO(), description: "", debit: "0", credit: "0" });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>إضافة عملية بنكية</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="entry_date" render={({ field }) => (
              <FormItem><FormLabel>التاريخ</FormLabel><FormControl><Input type="date" {...field} dir="ltr" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>الاسم</FormLabel><FormControl><Input {...field} placeholder="مثال: إيداع نقدي" /></FormControl><FormMessage /></FormItem>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "جاري الحفظ..." : "حفظ"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
