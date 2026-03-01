"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES } from "@/lib/constants";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CorrectionRequestWithRelations } from "@/types/database";

interface CorrectionApprovalDialogProps {
  request: CorrectionRequestWithRelations | null;
  onClose: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  customer_id: "العميل",
  product_id: "الصنف",
  quantity: "الكمية",
  price_per_ton: "سعر الطن",
  amount_paid: "المدفوع",
  transport_cost: "النولون",
  notes: "ملاحظات",
};

export function CorrectionApprovalDialog({
  request,
  onClose,
}: CorrectionApprovalDialogProps) {
  const supabase = createClient();
  const router = useRouter();
  const { userId } = useUser();
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    if (!request) return;
    setLoading(true);

    const { error } = await supabase.rpc("approve_correction", {
      p_request_id: request.id,
      p_admin_id: userId,
    });

    if (error) {
      toast.error(MESSAGES.error);
      setLoading(false);
      return;
    }

    toast.success(MESSAGES.correctionApproved);
    setLoading(false);
    onClose();
    router.refresh();
  }

  async function handleReject() {
    if (!request) return;
    if (!rejectionReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض");
      return;
    }
    setLoading(true);

    const { error } = await supabase
      .from("correction_requests")
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

    toast.success(MESSAGES.correctionRejected);
    setLoading(false);
    onClose();
    router.refresh();
  }

  if (!request) return null;

  const entry = request.entry;
  const changes = request.proposed_changes as Record<string, unknown>;

  function getOriginalValue(field: string): string {
    const val = entry[field as keyof typeof entry];
    if (typeof val === "number") {
      return field === "quantity"
        ? formatQuantity(val)
        : formatCurrency(val);
    }
    return String(val ?? "—");
  }

  function getNewValue(field: string): string {
    const val = changes[field];
    if (typeof val === "number") {
      return field === "quantity"
        ? formatQuantity(val)
        : formatCurrency(val);
    }
    return String(val ?? "—");
  }

  return (
    <Dialog open={!!request} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>مراجعة طلب التصحيح</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 bg-muted/30">
            <p className="text-sm">
              <span className="font-medium">طلب بواسطة:</span>{" "}
              {request.requester.full_name}
            </p>
            <p className="text-sm">
              <span className="font-medium">العميل:</span>{" "}
              {entry.customer?.name}
            </p>
            <p className="text-sm mt-1">
              <span className="font-medium">السبب:</span> {request.reason}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold">التغييرات المقترحة:</h4>
            <div className="space-y-2">
              {Object.keys(changes).map((field) => (
                <div
                  key={field}
                  className="flex items-center gap-3 rounded-md border p-2 text-sm"
                >
                  <span className="font-medium min-w-[80px]">
                    {FIELD_LABELS[field] ?? field}
                  </span>
                  <Badge variant="outline" className="text-destructive">
                    {getOriginalValue(field)}
                  </Badge>
                  <span>←</span>
                  <Badge className="bg-green-600">
                    {getNewValue(field)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

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
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              رفض
            </Button>
            <Button onClick={handleApprove} disabled={loading}>
              {loading ? "جاري المعالجة..." : "موافقة"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
