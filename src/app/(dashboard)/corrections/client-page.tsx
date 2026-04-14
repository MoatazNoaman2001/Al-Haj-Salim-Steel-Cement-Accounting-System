"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { CORRECTION_STATUS_LABELS } from "@/lib/constants";
import { useRealtimeCorrections, useRealtimeActionRequests } from "@/hooks/use-realtime";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CorrectionApprovalDialog } from "../cement-daily/correction-approval-dialog";
import { ActionApprovalDialog } from "./action-approval-dialog";
import type { CorrectionRequestWithRelations, ActionRequestWithRelations } from "@/types/database";

interface CorrectionsClientProps {
  requests: CorrectionRequestWithRelations[];
  actionRequests: ActionRequestWithRelations[];
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  approved: "secondary",
  rejected: "destructive",
};

const ENTITY_LABELS: Record<string, string> = {
  bank: "بنك",
  bank_transaction: "عملية بنكية",
  customer: "عميل",
  customer_transaction: "عملية عميل",
};

const ACTION_LABELS: Record<string, string> = {
  edit: "تعديل",
  delete: "حذف",
};

export function CorrectionsClient({ requests, actionRequests }: CorrectionsClientProps) {
  const [selectedRequest, setSelectedRequest] =
    useState<CorrectionRequestWithRelations | null>(null);
  const [selectedAction, setSelectedAction] =
    useState<ActionRequestWithRelations | null>(null);

  useRealtimeCorrections();
  useRealtimeActionRequests();

  const pendingCorrections = requests.filter((r) => r.status === "pending").length;
  const pendingActions = actionRequests.filter((r) => r.status === "pending").length;

  return (
    <>
      <div className="py-4">
        <Tabs defaultValue="corrections" dir="rtl">
          <TabsList className="mb-4">
            <TabsTrigger value="corrections" className="gap-2">
              طلبات التصحيح
              {pendingCorrections > 0 && (
                <Badge variant="default" className="h-5 min-w-5 text-xs px-1.5">
                  {pendingCorrections}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              طلبات التعديل والحذف
              {pendingActions > 0 && (
                <Badge variant="default" className="h-5 min-w-5 text-xs px-1.5">
                  {pendingActions}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="corrections">
            <div className="hidden md:block rounded-md border overflow-x-auto">
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
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        لا توجد طلبات تصحيح
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{formatDate(req.created_at)}</TableCell>
                        <TableCell>{req.entry?.customer?.name ?? "—"}</TableCell>
                        <TableCell>{req.requester?.full_name ?? "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{req.reason}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[req.status] ?? "outline"}>
                            {CORRECTION_STATUS_LABELS[req.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => setSelectedRequest(req)}>
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

            {/* Mobile card view for corrections */}
            <div className="md:hidden space-y-3">
              {requests.length === 0 ? (
                <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
                  لا توجد طلبات تصحيح
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="rounded-lg border p-3 space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {formatDate(req.created_at)}
                        </div>
                        <div className="font-semibold mt-0.5">
                          {req.entry?.customer?.name ?? "—"}
                        </div>
                      </div>
                      <Badge
                        variant={statusVariant[req.status] ?? "outline"}
                        className="shrink-0 text-[10px]"
                      >
                        {CORRECTION_STATUS_LABELS[req.status]}
                      </Badge>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">طلب بواسطة: </span>
                      {req.requester?.full_name ?? "—"}
                    </div>
                    <div className="text-xs border-t pt-2">{req.reason}</div>
                    {req.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedRequest(req)}
                      >
                        مراجعة
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions">
            <div className="hidden md:block rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">التاريخ</TableHead>
                    <TableHead className="text-start">الإجراء</TableHead>
                    <TableHead className="text-start">النوع</TableHead>
                    <TableHead className="text-start">طلب بواسطة</TableHead>
                    <TableHead className="text-start">السبب</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-start">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actionRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        لا توجد طلبات تعديل أو حذف
                      </TableCell>
                    </TableRow>
                  ) : (
                    actionRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{formatDate(req.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant={req.action === "delete" ? "destructive" : "outline"}>
                            {ACTION_LABELS[req.action]}
                          </Badge>
                        </TableCell>
                        <TableCell>{ENTITY_LABELS[req.entity]}</TableCell>
                        <TableCell>{req.requester?.full_name ?? "—"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{req.reason}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[req.status] ?? "outline"}>
                            {CORRECTION_STATUS_LABELS[req.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" && (
                            <Button size="sm" variant="outline" onClick={() => setSelectedAction(req)}>
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

            {/* Mobile card view for actions */}
            <div className="md:hidden space-y-3">
              {actionRequests.length === 0 ? (
                <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
                  لا توجد طلبات تعديل أو حذف
                </div>
              ) : (
                actionRequests.map((req) => (
                  <div key={req.id} className="rounded-lg border p-3 space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground">
                          {formatDate(req.created_at)}
                        </div>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Badge
                            variant={req.action === "delete" ? "destructive" : "outline"}
                            className="text-[10px]"
                          >
                            {ACTION_LABELS[req.action]}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {ENTITY_LABELS[req.entity]}
                          </Badge>
                        </div>
                      </div>
                      <Badge
                        variant={statusVariant[req.status] ?? "outline"}
                        className="shrink-0 text-[10px]"
                      >
                        {CORRECTION_STATUS_LABELS[req.status]}
                      </Badge>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">طلب بواسطة: </span>
                      {req.requester?.full_name ?? "—"}
                    </div>
                    <div className="text-xs border-t pt-2">{req.reason}</div>
                    {req.status === "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedAction(req)}
                      >
                        مراجعة
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CorrectionApprovalDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
      <ActionApprovalDialog
        request={selectedAction}
        onClose={() => setSelectedAction(null)}
      />
    </>
  );
}
