"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES } from "@/lib/constants";
import {
  addDepositSchema,
  type AddDepositFormValues,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface AddDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  userId: string;
}

export function AddDepositDialog({
  open,
  onOpenChange,
  date,
  userId,
}: AddDepositDialogProps) {
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<AddDepositFormValues>({
    resolver: zodResolver(addDepositSchema),
    defaultValues: {
      entry_date: date,
      amount: "0",
      description: "",
    },
  });

  async function onSubmit(values: AddDepositFormValues) {
    const { error } = await supabase.from("daily_deposits").insert({
      entry_date: values.entry_date,
      amount: Number(values.amount),
      description: values.description || null,
      created_by: userId,
    });

    if (error) {
      toast.error(MESSAGES.error);
      return;
    }

    toast.success(MESSAGES.depositAdded);
    form.reset({ entry_date: date, amount: "0", description: "" });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة إيداع جديد</DialogTitle>
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المبلغ</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>التفاصيل</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="مثال: توريد بيد عبود"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
