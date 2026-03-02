"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES } from "@/lib/constants";
import {
  addBondSchema,
  type AddBondFormValues,
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
import { CustomerCombobox } from "@/components/shared/customer-combobox";
import type { Customer } from "@/types/database";
import { useRouter } from "next/navigation";

interface AddBondDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Pick<Customer, "id" | "name">[];
  date: string;
  userId: string;
}

export function AddBondDialog({
  open,
  onOpenChange,
  customers,
  date,
  userId,
}: AddBondDialogProps) {
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<AddBondFormValues>({
    resolver: zodResolver(addBondSchema),
    defaultValues: {
      entry_date: date,
      customer_id: "",
      amount: "0",
      bond_number: "",
      notes: "",
    },
  });

  async function onSubmit(values: AddBondFormValues) {
    const { error } = await supabase.from("daily_bonds").insert({
      entry_date: values.entry_date,
      customer_id: values.customer_id,
      amount: Number(values.amount),
      bond_number: values.bond_number || null,
      notes: values.notes || null,
      created_by: userId,
    });

    if (error) {
      toast.error(MESSAGES.error);
      return;
    }

    toast.success(MESSAGES.bondAdded);
    form.reset({
      entry_date: date,
      customer_id: "",
      amount: "0",
      bond_number: "",
      notes: "",
    });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة بون جديد</DialogTitle>
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
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العميل</FormLabel>
                  <FormControl>
                    <CustomerCombobox
                      customers={customers}
                      value={field.value}
                      onChange={field.onChange}
                    />
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
              name="bond_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم البون</FormLabel>
                  <FormControl>
                    <Input {...field} dir="ltr" className="text-left" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
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
