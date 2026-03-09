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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const addCustomerSchema = z.object({
  name: z.string().min(1, "اسم العميل مطلوب"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type AddCustomerFormValues = z.infer<typeof addCustomerSchema>;

interface AddCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCustomerDialog({ open, onOpenChange }: AddCustomerDialogProps) {
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<AddCustomerFormValues>({
    resolver: zodResolver(addCustomerSchema),
    defaultValues: { name: "", phone: "", address: "", notes: "" },
  });

  async function onSubmit(values: AddCustomerFormValues) {
    const { error } = await supabase.from("customers").insert({
      name: values.name,
      phone: values.phone || null,
      address: values.address || null,
      notes: values.notes || null,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    toast.success(MESSAGES.customerAdded);
    form.reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>إضافة عميل جديد</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>اسم العميل</FormLabel><FormControl><Input {...field} placeholder="مثال: احمد توفيق" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>الهاتف</FormLabel><FormControl><Input {...field} dir="ltr" className="text-left" placeholder="01xxxxxxxxx" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem><FormLabel>العنوان</FormLabel><FormControl><Input {...field} placeholder="مثال: أسيوط الجديدة" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>ملاحظات</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem>
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
