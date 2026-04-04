"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Landmark, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Bank } from "@/types/database";

const editBankSchema = z.object({
  reason: z.string().min(10, "سبب التعديل يجب أن يكون 10 أحرف على الأقل"),
  name: z.string().min(1, "اسم البنك مطلوب"),
  balance: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: "يرجى إدخال رقم صحيح",
  }),
});

type EditBankFormValues = z.infer<typeof editBankSchema>;

interface EditHistoryItem {
  id: string;
  action: string;
  proposed_changes: Record<string, unknown> | null;
  reason: string;
  status: string;
  created_at: string;
  requester: { full_name: string } | null;
  reviewer: { full_name: string } | null;
  reviewed_at: string | null;
}

interface EditBankDialogProps {
  bank: Bank | null;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  name: "الاسم",
  balance: "الرصيد الافتتاحي",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
};

export function EditBankDialog({ bank, onClose }: EditBankDialogProps) {
  const supabase = createClient();
  const router = useRouter();
  const { userId } = useUser();
  const [history, setHistory] = useState<EditHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const form = useForm<EditBankFormValues>({
    resolver: zodResolver(editBankSchema),
    values: bank ? { reason: "", name: bank.name, balance: String(bank.balance) } : undefined,
  });

  useEffect(() => {
    if (!bank) { setHistory([]); return; }

    setLoadingHistory(true);
    supabase
      .from("action_requests")
      .select(`*, requester:profiles!requested_by(full_name), reviewer:profiles!reviewed_by(full_name)`)
      .eq("entity", "bank")
      .eq("entity_id", bank.id)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: EditHistoryItem[] | null }) => {
        setHistory(data ?? []);
        setLoadingHistory(false);
      });
  }, [bank?.id]);

  async function onSubmit(values: EditBankFormValues) {
    if (!bank) return;

    const newBalance = Number(values.balance) || 0;

    if (values.name === bank.name && newBalance === bank.balance) {
      toast.error("لم يتم تغيير أي قيمة");
      return;
    }

    const proposedChanges: Record<string, unknown> = {};
    if (values.name !== bank.name) proposedChanges.name = values.name;
    if (newBalance !== bank.balance) proposedChanges.balance = newBalance;

    const { error } = await supabase.from("action_requests").insert({
      action: "edit",
      entity: "bank",
      entity_id: bank.id,
      proposed_changes: proposedChanges,
      reason: values.reason,
      requested_by: userId,
    });

    if (error) { toast.error(MESSAGES.error); return; }

    toast.success("تم إرسال طلب التعديل بنجاح");
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={!!bank} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Landmark className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">طلب تعديل حساب بنكي</DialogTitle>
          <DialogDescription>سيتم إرسال الطلب للمراجعة من قبل المسؤول</DialogDescription>
        </DialogHeader>

        <Separator />

        {bank && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
              <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">
                    سبب التعديل <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea placeholder="اكتب سبب التعديل (10 أحرف على الأقل)..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">
                    اسم البنك <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl><Input {...field} className="h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="balance" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">
                    رصيد افتتاحي <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} dir="ltr" className="h-11 text-left font-mono text-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <Separator />

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" size="lg" onClick={onClose}>إلغاء</Button>
                <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "جاري الإرسال..." : "إرسال طلب التعديل"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {/* Edit History */}
        {history.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">سجل التعديلات السابقة</h4>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {history.map((item) => {
                  const changes = item.proposed_changes;
                  return (
                    <div key={item.id} className="rounded-md border p-3 bg-muted/20 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{formatDate(item.created_at)}</span>
                        <Badge variant={STATUS_VARIANT[item.status]} className="text-xs">
                          {STATUS_LABELS[item.status]}
                        </Badge>
                      </div>
                      <p>
                        <span className="font-medium">بواسطة:</span> {item.requester?.full_name ?? "—"}
                      </p>
                      {item.action === "edit" && changes && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(changes).map(([field, value]) => (
                            <Badge key={field} variant="secondary" className="text-xs">
                              {FIELD_LABELS[field] ?? field}: {typeof value === "number" ? formatCurrency(value) : String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {item.action === "delete" && (
                        <Badge variant="destructive" className="text-xs">طلب حذف</Badge>
                      )}
                      <p className="text-muted-foreground text-xs">{item.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
        {loadingHistory && (
          <p className="text-sm text-center text-muted-foreground">جاري تحميل السجل...</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
