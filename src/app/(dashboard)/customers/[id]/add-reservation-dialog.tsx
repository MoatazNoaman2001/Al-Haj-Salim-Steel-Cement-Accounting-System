"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { safeInsert } from "@/lib/supabase/safe-fetch";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Customer, Product } from "@/types/database";

const schema = z.object({
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  partner_customer_id: z.string().min(1, "اختر العميل الشريك"),
  product_id: z.string().optional(),
  type: z.enum(["credit", "debit"]),
  amount: z.string().min(1, "المبلغ مطلوب"),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AddReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  userId: string;
  partners: Pick<Customer, "id" | "name">[];
  products: Pick<Product, "id" | "name">[];
}

export function AddReservationDialog({
  open,
  onOpenChange,
  customerId,
  userId,
  partners,
  products,
}: AddReservationDialogProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_date: todayISO(),
      partner_customer_id: "",
      product_id: "",
      type: "credit",
      amount: "",
      description: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) form.reset({
      entry_date: todayISO(),
      partner_customer_id: "",
      product_id: "",
      type: "credit",
      amount: "",
      description: "",
      notes: "",
    });
  }, [open, form]);

  // Filter out the account-holder from partner choices.
  const partnerOptions = partners.filter((p) => p.id !== customerId);

  async function onSubmit(values: FormValues) {
    const amount = Number(values.amount) || 0;
    if (amount <= 0) { toast.error("يرجى إدخال مبلغ صحيح"); return; }

    const credit = values.type === "credit" ? amount : 0;
    const debit  = values.type === "debit"  ? amount : 0;

    const productName = values.product_id
      ? products.find((p) => p.id === values.product_id)?.name ?? ""
      : "";
    const description = values.description?.trim() || productName || null;

    const { error } = await safeInsert("customer_reservations", {
      customer_id: customerId,
      partner_customer_id: values.partner_customer_id,
      product_id: values.product_id || null,
      entry_date: values.entry_date,
      description,
      credit,
      debit,
      notes: values.notes?.trim() || null,
      created_by: userId,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    toast.success("تم إضافة الحجز بنجاح");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>إضافة حجز جديد</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="entry_date" render={({ field }) => (
              <FormItem>
                <FormLabel>التاريخ</FormLabel>
                <FormControl><Input type="date" {...field} dir="ltr" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="partner_customer_id" render={({ field }) => (
              <FormItem>
                <FormLabel>العميل الشريك <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partnerOptions.length === 0 && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        لا يوجد عملاء آخرون
                      </div>
                    )}
                    {partnerOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="product_id" render={({ field }) => (
              <FormItem>
                <FormLabel>الصنف</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="اختر الصنف (اختياري)" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem>
                <FormLabel>نوع الحركة</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="credit">حجز / إيداع (له)</SelectItem>
                    <SelectItem value="debit">سحب / تسليم (عليه)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>المبلغ</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>التفاصيل</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="اختياري — إذا تركته فارغاً سيُكتب اسم الصنف" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>ملاحظات</FormLabel>
                <FormControl><Textarea {...field} rows={2} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
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
