"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { safeInsert } from "@/lib/supabase/safe-fetch";
import { MESSAGES } from "@/lib/constants";
import {
  addCashierEntrySchema,
  type AddCashierEntryFormValues,
} from "@/lib/validations/cement-daily";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface AddCashierEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  userId: string;
}

export function AddCashierEntryDialog({
  open,
  onOpenChange,
  date,
  userId,
}: AddCashierEntryDialogProps) {
  const router = useRouter();

  const form = useForm<AddCashierEntryFormValues>({
    resolver: zodResolver(addCashierEntrySchema),
    defaultValues: {
      entry_date: date,
      description: "",
      debit: "0",
      credit: "0",
    },
  });

  async function onSubmit(values: AddCashierEntryFormValues) {
    const debit = Number(values.debit);
    const credit = Number(values.credit);

    if (debit === 0 && credit === 0) {
      toast.error("يجب إدخال قيمة في عليه أو له");
      return;
    }

    const { error } = await safeInsert("daily_cashier",{
      entry_date: values.entry_date,
      description: values.description,
      debit,
      credit,
      created_by: userId,
    });

    if (error) {
      toast.error(MESSAGES.error);
      return;
    }

    toast.success(MESSAGES.cashierEntryAdded);
    form.reset({
      entry_date: date,
      description: "",
      debit: "0",
      credit: "0",
    });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة قيد جديد</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="entry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التاريخ</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} dir="ltr" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التفاصيل</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="مثال: واصل من الحج سليم البيت"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="debit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عليه (خروج)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        dir="ltr"
                        className="text-left"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>له (دخول)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        dir="ltr"
                        className="text-left"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
