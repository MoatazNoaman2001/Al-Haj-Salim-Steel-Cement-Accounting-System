"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES } from "@/lib/constants";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const addBankSchema = z.object({
  name: z.string().min(1, "اسم البنك مطلوب"),
  balance: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "يرجى إدخال رقم صحيح",
  }),
});

type AddBankFormValues = z.infer<typeof addBankSchema>;

interface AddBankDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBankDialog({ open, onOpenChange }: AddBankDialogProps) {
  const supabase = createClient();
  const router = useRouter();

  const form = useForm<AddBankFormValues>({
    resolver: zodResolver(addBankSchema),
    defaultValues: { name: "", balance: "" },
  });

  async function onSubmit(values: AddBankFormValues) {
    const balance = Number(values.balance) || 0;

    const { error } = await supabase.from("banks").insert({
      name: values.name,
      balance,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    toast.success(MESSAGES.bankAdded);
    form.reset();
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">إضافة حساب بنكي جديد</DialogTitle>
          <DialogDescription>أدخل بيانات الحساب البنكي الجديد</DialogDescription>
        </DialogHeader>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">
                  اسم البنك <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="مثال: بنك الاهلى (سليم)"
                    className="h-11"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="balance" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">
                  رصيد افتتاحي <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    dir="ltr"
                    className="h-11 text-left font-mono text-lg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <Separator />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => { form.reset(); onOpenChange(false); }}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "جاري الحفظ..." : "إضافة البنك"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
