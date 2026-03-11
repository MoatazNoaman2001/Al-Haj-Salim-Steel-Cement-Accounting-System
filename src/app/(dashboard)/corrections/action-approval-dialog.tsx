"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ActionRequestWithRelations } from "@/types/database";

interface ActionApprovalDialogProps {
  request: ActionRequestWithRelations | null;
  onClose: () => void;
}

const ENTITY_LABELS: Record<string, string> = {
  bank: "حساب بنكي",
  bank_transaction: "عملية بنكية",
  customer: "عميل",
  customer_transaction: "عملية عميل",
};

const ACTION_LABELS: Record<string, string> = {
  edit: "تعديل",
  delete: "حذف",
};

const FIELD_LABELS: Record<string, string> = {
  name: "الاسم",
  balance: "الرصيد الافتتاحي",
  description: "التفاصيل",
  debit: "مدين",
  credit: "دائن",
  notes: "ملاحظات",
  phone: "الهاتف",
  address: "العنوان",
  quantity: "الكمية",
  price: "السعر",
};

export function ActionApprovalDialog({ request, onClose }: ActionApprovalDialogProps) {
  const supabase = createClient();
  const router = useRouter();
  const { userId } = useUser();
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    if (!request) return;
    setLoading(true);

    try {
      // Update the action request status
      const { error: updateError } = await supabase
        .from("action_requests")
        .update({
          status: "approved",
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (updateError) throw updateError;

      // Execute the action
      if (request.action === "edit" && request.proposed_changes) {
        const { error } = await supabase
          .from(getTableName(request.entity))
          .update(request.proposed_changes)
          .eq("id", request.entity_id);

        if (error) throw error;
      } else if (request.action === "delete") {
        if (request.entity === "bank") {
          // Delete bank transactions first, then the bank
          await supabase
            .from("bank_transactions")
            .delete()
            .eq("bank_id", request.entity_id);
          const { error } = await supabase
            .from("banks")
            .delete()
            .eq("id", request.entity_id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from(getTableName(request.entity))
            .delete()
            .eq("id", request.entity_id);
          if (error) throw error;
        }
      }

      toast.success("تمت الموافقة على الطلب وتنفيذه");
      onClose();
      router.refresh();
    } catch {
      toast.error(MESSAGES.error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReject() {
    if (!request) return;
    if (!rejectionReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }
    setLoading(true);

    const { error } = await supabase
      .from("action_requests")
      .update({
        status: "rejected",
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
      })
      .eq("id", request.id);

    if (error) {
      toast.error(MESSAGES.error);
      setLoading(false);
      return;
    }

    toast.success("تم رفض الطلب");
    setRejectionReason("");
    setLoading(false);
    onClose();
    router.refresh();
  }

  if (!request) return null;

  const changes = request.proposed_changes as Record<string, unknown> | null;

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            مراجعة طلب {ACTION_LABELS[request.action]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/30 space-y-1">
            <p className="text-sm">
              <span className="font-medium">النوع:</span>{" "}
              <Badge variant={request.action === "delete" ? "destructive" : "default"}>
                {ACTION_LABELS[request.action]} {ENTITY_LABELS[request.entity]}
              </Badge>
            </p>
            <p className="text-sm">
              <span className="font-medium">طلب بواسطة:</span>{" "}
              {request.requester?.full_name ?? "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">السبب:</span> {request.reason}
            </p>
          </div>

          {request.action === "edit" && changes && Object.keys(changes).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">التغييرات المقترحة:</h4>
                <div className="space-y-2">
                  {Object.entries(changes).map(([field, value]) => (
                    <div
                      key={field}
                      className="flex items-center gap-3 rounded-md border p-2 text-sm"
                    >
                      <span className="font-medium min-w-[80px]">
                        {FIELD_LABELS[field] ?? field}
                      </span>
                      <span>→</span>
                      <Badge className="bg-green-600">
                        {typeof value === "number" ? formatCurrency(value) : String(value)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {request.action === "delete" && (
            <>
              <Separator />
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive font-medium">
                  سيتم حذف {ENTITY_LABELS[request.entity]} وجميع البيانات المرتبطة به نهائياً
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <Label>سبب الرفض (مطلوب في حالة الرفض)</Label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="اكتب سبب الرفض..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={loading}>
              رفض
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? "جاري المعالجة..." : "موافقة وتنفيذ"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getTableName(entity: string): string {
  switch (entity) {
    case "bank": return "banks";
    case "bank_transaction": return "bank_transactions";
    case "customer": return "customers";
    case "customer_transaction": return "customer_transactions";
    default: return entity;
  }
}
