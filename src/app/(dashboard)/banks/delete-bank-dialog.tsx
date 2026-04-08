"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { safeInsert } from "@/lib/supabase/safe-fetch";
import { MESSAGES } from "@/lib/constants";
import { useUser } from "@/hooks/use-user";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Bank } from "@/types/database";

const deleteBankSchema = z.object({
  reason: z.string().min(10, "سبب الحذف يجب أن يكون 10 أحرف على الأقل"),
});

type DeleteBankFormValues = z.infer<typeof deleteBankSchema>;

interface DeleteBankDialogProps {
  bank: Bank | null;
  onClose: () => void;
}

export function DeleteBankDialog({ bank, onClose }: DeleteBankDialogProps) {
  const router = useRouter();
  const { userId } = useUser();

  const form = useForm<DeleteBankFormValues>({
    resolver: zodResolver(deleteBankSchema),
    defaultValues: { reason: "" },
  });

  async function onSubmit(values: DeleteBankFormValues) {
    if (!bank) return;

    const { error } = await safeInsert("action_requests",{
      action: "delete",
      entity: "bank",
      entity_id: bank.id,
      proposed_changes: null,
      reason: values.reason,
      requested_by: userId,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    toast.success("تم إرسال طلب الحذف بنجاح");
    form.reset();
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={!!bank} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-xl">طلب حذف حساب بنكي</DialogTitle>
          <DialogDescription>
            سيتم إرسال طلب حذف <strong>{bank?.name}</strong> وجميع عملياته للمراجعة
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {bank && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">
                    سبب الحذف <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="اكتب سبب الحذف (10 أحرف على الأقل)..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Separator />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" size="lg" onClick={onClose}>إلغاء</Button>
                <Button type="submit" size="lg" variant="destructive" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "جاري الإرسال..." : "إرسال طلب الحذف"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
