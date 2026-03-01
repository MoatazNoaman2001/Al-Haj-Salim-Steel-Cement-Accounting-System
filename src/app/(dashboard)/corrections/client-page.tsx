"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { CORRECTION_STATUS_LABELS } from "@/lib/constants";
import { useRealtimeCorrections } from "@/hooks/use-realtime";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CorrectionApprovalDialog } from "../cement-daily/correction-approval-dialog";
import type { CorrectionRequestWithRelations } from "@/types/database";

interface CorrectionsClientProps {
  requests: CorrectionRequestWithRelations[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
};

export function CorrectionsClient({ requests }: CorrectionsClientProps) {
  const [selectedRequest, setSelectedRequest] =
    useState<CorrectionRequestWithRelations | null>(null);

  useRealtimeCorrections();

  return (
    <>
      <div className="py-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">التاريخ</TableHead>
                <TableHead className="text-start">العميل</TableHead>
                <TableHead className="text-start">طلب بواسطة</TableHead>
                <TableHead className="text-start">السبب</TableHead>
                <TableHead className="text-start">الحالة</TableHead>
                <TableHead className="text-start">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    لا توجد طلبات تصحيح
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{formatDate(req.created_at)}</TableCell>
                    <TableCell>
                      {req.entry?.customer?.name ?? "—"}
                    </TableCell>
                    <TableCell>{req.requester?.full_name ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {req.reason}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[req.status] ?? "outline"}>
                        {CORRECTION_STATUS_LABELS[req.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {req.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequest(req)}
                        >
                          مراجعة
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CorrectionApprovalDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </>
  );
}
