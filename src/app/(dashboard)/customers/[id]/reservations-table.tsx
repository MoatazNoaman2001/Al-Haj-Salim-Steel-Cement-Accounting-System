"use client";

import { useMemo, useState } from "react";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useUser } from "@/hooks/use-user";
import { useActiveCustomers, useCustomerReservations } from "@/hooks/use-customers-queries";
import { useCementProducts } from "@/hooks/use-cement-daily-queries";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { exportCustomerReservationReport } from "@/lib/export-excel";
import { AddReservationDialog } from "./add-reservation-dialog";
import type { CustomerReservationWithRelations } from "@/types/database";

interface ReservationsTableProps {
  customerId: string;
  customerName: string;
  initialReservations: CustomerReservationWithRelations[];
}

interface PivotRow {
  id: string;
  entry_date: string;
  description: string;
  partnerAmounts: Record<string, { credit: number; debit: number }>;
  runningBalance: number;
  is_corrected: boolean;
}

export function ReservationsTable({
  customerId,
  customerName,
  initialReservations,
}: ReservationsTableProps) {
  const { userId } = useUser();
  const [addOpen, setAddOpen] = useState(false);

  const { data: reservations } = useCustomerReservations(customerId, initialReservations);
  const { data: partners = [] } = useActiveCustomers();
  const { data: products = [] } = useCementProducts("cement");

  const { partnerColumns, rows, totalCredit, totalDebit, finalBalance } = useMemo(() => {
    const active = reservations.filter((r) => !r.is_corrected);

    const partnerMap = new Map<string, string>();
    for (const r of active) {
      if (!partnerMap.has(r.partner_customer_id)) {
        partnerMap.set(
          r.partner_customer_id,
          r.partner_customer?.name ?? "—",
        );
      }
    }
    const partnerColumns = Array.from(partnerMap, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));

    let running = 0;
    const rows: PivotRow[] = active.map((r) => {
      running += r.credit - r.debit;
      const desc = r.description ?? r.product?.name ?? "";
      return {
        id: r.id,
        entry_date: r.entry_date,
        description: desc,
        partnerAmounts: {
          [r.partner_customer_id]: { credit: r.credit, debit: r.debit },
        },
        runningBalance: running,
        is_corrected: r.is_corrected,
      };
    });

    const totalCredit = active.reduce((s, r) => s + r.credit, 0);
    const totalDebit  = active.reduce((s, r) => s + r.debit, 0);
    return {
      partnerColumns,
      rows,
      totalCredit,
      totalDebit,
      finalBalance: totalCredit - totalDebit,
    };
  }, [reservations]);

  function partnerCellValue(row: PivotRow, partnerId: string): string {
    const v = row.partnerAmounts[partnerId];
    if (!v) return "";
    if (v.credit > 0) return formatCurrency(v.credit);
    if (v.debit > 0) return `-${formatCurrency(v.debit)}`;
    return "";
  }

  return (
    <div>
      <div className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-bold">محجوز العملاء</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() =>
              exportCustomerReservationReport(
                customerName,
                partnerColumns,
                rows,
                totalCredit,
                totalDebit,
                finalBalance,
              )
            }
            disabled={rows.length === 0}
          >
            <Download className="h-4 w-4" /><span className="hidden sm:inline">تصدير Excel</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />إضافة حجز
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalCredit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي السحوبات</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">الرصيد المتبقي</p>
          <p className={cn(
            "text-xl font-bold",
            finalBalance > 0 ? "text-green-600" : finalBalance < 0 ? "text-red-600" : "",
          )}>
            {formatCurrency(finalBalance)}
          </p>
        </CardContent></Card>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">م</TableHead>
              <TableHead className="text-start">التاريخ</TableHead>
              <TableHead className="text-start">التفاصيل</TableHead>
              {partnerColumns.map((p) => (
                <TableHead key={p.id} className="text-start">{p.name}</TableHead>
              ))}
              <TableHead className="text-start">الرصيد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((row, i) => (
              <TableRow key={row.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell>{formatDate(row.entry_date)}</TableCell>
                <TableCell>{row.description}</TableCell>
                {partnerColumns.map((p) => {
                  const v = row.partnerAmounts[p.id];
                  return (
                    <TableCell
                      key={p.id}
                      className={cn(
                        v?.credit ? "text-green-600 font-semibold" : "",
                        v?.debit ? "text-red-600 font-semibold" : "",
                      )}
                    >
                      {partnerCellValue(row, p.id)}
                    </TableCell>
                  );
                })}
                <TableCell className={cn(
                  "font-bold",
                  row.runningBalance > 0 ? "text-green-600" :
                    row.runningBalance < 0 ? "text-red-600" : "",
                )}>
                  {formatCurrency(row.runningBalance)}
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell
                  colSpan={4 + partnerColumns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  لا توجد حجوزات لهذا العميل
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3}>الإجمالي</TableCell>
                {partnerColumns.map((p) => {
                  const credit = rows.reduce(
                    (s, r) => s + (r.partnerAmounts[p.id]?.credit ?? 0),
                    0,
                  );
                  const debit = rows.reduce(
                    (s, r) => s + (r.partnerAmounts[p.id]?.debit ?? 0),
                    0,
                  );
                  const net = credit - debit;
                  return (
                    <TableCell
                      key={p.id}
                      className={cn(
                        net > 0 ? "text-green-600" :
                          net < 0 ? "text-red-600" : "",
                      )}
                    >
                      {net !== 0 ? formatCurrency(net) : ""}
                    </TableCell>
                  );
                })}
                <TableCell className={cn(
                  finalBalance > 0 ? "text-green-600" :
                    finalBalance < 0 ? "text-red-600" : "",
                )}>
                  {formatCurrency(finalBalance)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddReservationDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        customerId={customerId}
        userId={userId}
        partners={partners}
        products={products}
      />
    </div>
  );
}
